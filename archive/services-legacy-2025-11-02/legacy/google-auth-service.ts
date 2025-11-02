/**
 * Google OAuth Service
 * 管理 Google OAuth 2.0 Token 的授權、儲存、刷新
 */

import { google, Auth } from 'googleapis';
import { getSupabaseClient } from './supabase-client';

interface TokenRecord {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  is_valid: boolean;
  last_error?: string;
}

export class GoogleAuthService {
  private oauth2Client: Auth.OAuth2Client;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback'
    );
  }

  /**
   * 取得授權 URL（使用者點擊後導向 Google 授權頁面）
   */
  getAuthUrl(userId: string): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline', // 必須設定，才能取得 refresh_token
      prompt: 'consent', // 強制顯示授權同意畫面
      scope: [
        'https://www.googleapis.com/auth/spreadsheets.readonly',
        'https://www.googleapis.com/auth/userinfo.email'
      ],
      state: userId // 傳遞 userId，callback 時會回傳
    });
  }

  /**
   * 處理 OAuth Callback，交換 code 為 token
   */
  async handleCallback(code: string, userId: string): Promise<void> {
    const { tokens } = await this.oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token || !tokens.expiry_date) {
      throw new Error('Invalid tokens received from Google');
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase client not available');
    }

    // 儲存到 Supabase
    const { error } = await supabase.from('google_oauth_tokens').upsert({
      user_id: userId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_type: tokens.token_type || 'Bearer',
      expires_at: new Date(tokens.expiry_date).toISOString(),
      scope: tokens.scope || 'https://www.googleapis.com/auth/spreadsheets.readonly',
      is_valid: true,
      updated_at: new Date().toISOString()
    });

    if (error) {
      throw new Error(`Failed to save token: ${error.message}`);
    }

    console.log(`[GoogleAuth] ✅ Token saved for user ${userId}`);
  }

  /**
   * 取得有效的 OAuth2Client（自動刷新 token）
   * @returns 已設定憑證的 OAuth2Client 實例
   */
  async getValidOAuth2Client(userId: string): Promise<Auth.OAuth2Client> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase client not available');
    }

    const { data: tokenRecord, error } = await supabase
      .from('google_oauth_tokens')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !tokenRecord) {
      throw new Error('未授權 Google Sheets，請先完成授權');
    }

    const now = new Date();
    const expiresAt = new Date(tokenRecord.expires_at);

    // 提前 5 分鐘刷新（避免邊界條件）
    const shouldRefresh = now >= new Date(expiresAt.getTime() - 5 * 60 * 1000);

    if (shouldRefresh) {
      console.log(`[GoogleAuth] Token expired or expiring soon, refreshing...`);
      await this.refreshToken(tokenRecord);

      // 重新查詢更新後的 token
      const { data: updatedToken } = await supabase
        .from('google_oauth_tokens')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!updatedToken) {
        throw new Error('Failed to retrieve refreshed token');
      }

      this.oauth2Client.setCredentials({
        access_token: updatedToken.access_token,
        refresh_token: updatedToken.refresh_token,
        expiry_date: new Date(updatedToken.expires_at).getTime()
      });
    } else {
      this.oauth2Client.setCredentials({
        access_token: tokenRecord.access_token,
        refresh_token: tokenRecord.refresh_token,
        expiry_date: new Date(tokenRecord.expires_at).getTime()
      });
    }

    return this.oauth2Client;
  }

  /**
   * 刷新 Access Token
   */
  private async refreshToken(tokenRecord: TokenRecord): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase client not available');
    }

    try {
      this.oauth2Client.setCredentials({
        refresh_token: tokenRecord.refresh_token
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();

      if (!credentials.access_token || !credentials.expiry_date) {
        throw new Error('Invalid refreshed credentials');
      }

      // 更新資料庫
      const { error } = await supabase
        .from('google_oauth_tokens')
        .update({
          access_token: credentials.access_token,
          expires_at: new Date(credentials.expiry_date).toISOString(),
          is_valid: true,
          last_error: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', tokenRecord.user_id);

      if (error) {
        throw new Error(`Failed to update token: ${error.message}`);
      }

      console.log(`[GoogleAuth] ✅ Token refreshed for user ${tokenRecord.user_id}`);
    } catch (error: any) {
      console.error(`[GoogleAuth] Token refresh failed:`, error);

      // 標記為無效
      await supabase
        .from('google_oauth_tokens')
        .update({
          is_valid: false,
          last_error: error.message,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', tokenRecord.user_id);

      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  /**
   * 檢查憑證有效性（使用安全的方式）
   */
  async validateCredentials(userId: string): Promise<boolean> {
    try {
      const oauth2Client = await this.getValidOAuth2Client(userId);

      // ✅ 使用 OAuth2 API 驗證 token（不會呼叫 Sheets API）
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      await oauth2.userinfo.get();

      return true;
    } catch (error: any) {
      console.error(`[GoogleAuth] Credential validation failed:`, error);
      return false;
    }
  }

  /**
   * 撤銷授權
   */
  async revokeToken(userId: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase client not available');
    }

    const { data: tokenRecord } = await supabase
      .from('google_oauth_tokens')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (tokenRecord) {
      try {
        await this.oauth2Client.revokeToken(tokenRecord.access_token);
      } catch (error) {
        console.warn('[GoogleAuth] Token revocation failed:', error);
      }

      await supabase
        .from('google_oauth_tokens')
        .delete()
        .eq('user_id', userId);
    }
  }

  /**
   * 檢查使用者是否已授權
   */
  async isAuthorized(userId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return false;
    }

    const { data: tokenRecord } = await supabase
      .from('google_oauth_tokens')
      .select('is_valid')
      .eq('user_id', userId)
      .single();

    return tokenRecord?.is_valid === true;
  }
}

export const googleAuthService = new GoogleAuthService();
