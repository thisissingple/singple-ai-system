/**
 * Facebook Marketing API 服務
 * 用途：處理 Facebook OAuth 登入和 Lead Ads 名單抓取
 */

import fetch from 'node-fetch';

// Facebook Graph API 基礎 URL
const FACEBOOK_API_VERSION = 'v18.0';
const FACEBOOK_GRAPH_URL = `https://graph.facebook.com/${FACEBOOK_API_VERSION}`;

// 環境變數
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || '';
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || '';
const FACEBOOK_CALLBACK_URL = process.env.FACEBOOK_CALLBACK_URL || 'http://localhost:5000/api/facebook/callback';

/**
 * 產生 Facebook OAuth 登入 URL（Meta Business Integration 方式）
 * 使用彈出視窗 + business_management scope
 */
export function generateFacebookAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: FACEBOOK_APP_ID,
    redirect_uri: FACEBOOK_CALLBACK_URL,
    state: state,  // 防止 CSRF 攻擊
    scope: 'business_management,pages_show_list,pages_manage_ads,leads_retrieval,pages_read_engagement',
    auth_type: 'rerequest',  // 強制重新授權
    display: 'popup',  // 彈出視窗模式
  });

  return `https://www.facebook.com/${FACEBOOK_API_VERSION}/dialog/oauth?${params.toString()}`;
}

/**
 * 用 authorization code 換取 access token
 */
export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
  expires_in: number;
}> {
  const params = new URLSearchParams({
    client_id: FACEBOOK_APP_ID,
    client_secret: FACEBOOK_APP_SECRET,
    redirect_uri: FACEBOOK_CALLBACK_URL,
    code: code,
  });

  const url = `${FACEBOOK_GRAPH_URL}/oauth/access_token?${params.toString()}`;

  const response = await fetch(url);
  const data: any = await response.json();

  if (data.error) {
    throw new Error(`Facebook OAuth 錯誤: ${data.error.message}`);
  }

  return {
    access_token: data.access_token,
    expires_in: data.expires_in || 5184000,  // 預設 60 天
  };
}

/**
 * 取得 Facebook 使用者資訊
 */
export async function getFacebookUser(accessToken: string): Promise<{
  id: string;
  name: string;
  email?: string;
}> {
  const url = `${FACEBOOK_GRAPH_URL}/me?fields=id,name,email&access_token=${accessToken}`;

  const response = await fetch(url);
  const data: any = await response.json();

  if (data.error) {
    throw new Error(`取得使用者資訊失敗: ${data.error.message}`);
  }

  return {
    id: data.id,
    name: data.name,
    email: data.email,
  };
}

/**
 * 取得使用者管理的粉絲專頁列表
 */
export async function getFacebookPages(accessToken: string): Promise<Array<{
  id: string;
  name: string;
  access_token: string;  // Page Access Token
  category: string;
}>> {
  const url = `${FACEBOOK_GRAPH_URL}/me/accounts?access_token=${accessToken}`;

  const response = await fetch(url);
  const data: any = await response.json();

  if (data.error) {
    throw new Error(`取得粉絲專頁失敗: ${data.error.message}`);
  }

  return data.data || [];
}

/**
 * 取得粉絲專頁的 Lead Ads 表單列表
 */
export async function getPageLeadForms(pageId: string, pageAccessToken: string): Promise<Array<{
  id: string;
  name: string;
  status: string;
  leads_count: number;
}>> {
  const url = `${FACEBOOK_GRAPH_URL}/${pageId}/leadgen_forms?fields=id,name,status,leads_count&access_token=${pageAccessToken}`;

  const response = await fetch(url);
  const data: any = await response.json();

  if (data.error) {
    throw new Error(`取得表單列表失敗: ${data.error.message}`);
  }

  return data.data || [];
}

/**
 * 抓取表單的名單
 */
export async function getFormLeads(
  formId: string,
  pageAccessToken: string,
  options: {
    sinceTimestamp?: number;  // 只抓取此時間後的名單
    limit?: number;
  } = {}
): Promise<Array<{
  id: string;
  created_time: string;
  ad_id?: string;
  ad_name?: string;
  form_id: string;
  field_data: Array<{ name: string; values: string[] }>;
}>> {
  let url = `${FACEBOOK_GRAPH_URL}/${formId}/leads?fields=id,created_time,ad_id,ad_name,form_id,field_data&access_token=${pageAccessToken}`;

  // 加入時間過濾
  if (options.sinceTimestamp) {
    const filtering = JSON.stringify([
      {
        field: 'time_created',
        operator: 'GREATER_THAN',
        value: options.sinceTimestamp,
      },
    ]);
    url += `&filtering=${encodeURIComponent(filtering)}`;
  }

  // 限制數量
  if (options.limit) {
    url += `&limit=${options.limit}`;
  } else {
    url += `&limit=100`;  // 預設一次抓 100 筆
  }

  const response = await fetch(url);
  const data: any = await response.json();

  if (data.error) {
    throw new Error(`抓取名單失敗: ${data.error.message}`);
  }

  return data.data || [];
}

/**
 * 解析表單欄位資料
 */
export function parseFieldData(fieldData: Array<{ name: string; values: string[] }>): {
  studentName: string;
  studentPhone: string;
  studentEmail: string;
  allFields: Record<string, string>;
} {
  const fieldMap: Record<string, string> = {};

  fieldData.forEach((field) => {
    fieldMap[field.name] = field.values?.[0] || '';
  });

  // 嘗試多種欄位名稱（中英文）
  const studentName =
    fieldMap['姓名'] ||
    fieldMap['full_name'] ||
    fieldMap['name'] ||
    fieldMap['Full Name'] ||
    fieldMap['Name'] ||
    '';

  const studentPhone =
    fieldMap['電話'] ||
    fieldMap['phone_number'] ||
    fieldMap['phone'] ||
    fieldMap['Phone'] ||
    fieldMap['手機'] ||
    fieldMap['mobile'] ||
    '';

  const studentEmail =
    fieldMap['Email'] ||
    fieldMap['email'] ||
    fieldMap['E-mail'] ||
    fieldMap['電子郵件'] ||
    '';

  return {
    studentName,
    studentPhone,
    studentEmail,
    allFields: fieldMap,
  };
}

/**
 * 檢查環境變數是否已設定
 */
export function checkFacebookConfig(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  if (!FACEBOOK_APP_ID) missing.push('FACEBOOK_APP_ID');
  if (!FACEBOOK_APP_SECRET) missing.push('FACEBOOK_APP_SECRET');
  if (!FACEBOOK_CALLBACK_URL) missing.push('FACEBOOK_CALLBACK_URL');

  return {
    valid: missing.length === 0,
    missing,
  };
}
