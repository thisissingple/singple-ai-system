/**
 * Email Service
 * 負責發送系統通知Email
 */

import * as nodemailer from 'nodemailer';

// Email 設定
const EMAIL_CONFIG = {
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
};

/**
 * 建立 Email 傳輸器
 */
function createTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.warn('[Email Service] ⚠️ EMAIL_USER 或 EMAIL_PASSWORD 未設定，Email 功能將被停用');
    return null;
  }

  return nodemailer.createTransport(EMAIL_CONFIG);
}

/**
 * 發送新帳號通知 Email
 */
export async function sendAccountCreationEmail(
  toEmail: string,
  toName: string,
  tempPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = createTransporter();

    if (!transporter) {
      console.log('[Email Service] Email 功能未啟用，跳過發送');
      return {
        success: false,
        error: 'Email 服務未設定（需要 EMAIL_USER 和 EMAIL_PASSWORD 環境變數）',
      };
    }

    const mailOptions = {
      from: `"Singple 教育機構管理系統" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: '🎉 歡迎加入 Singple 教育機構管理系統',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .password-box { background: #fff; border: 2px solid #667eea; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
            .password { font-size: 24px; font-weight: bold; color: #667eea; letter-spacing: 2px; font-family: 'Courier New', monospace; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .btn { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 歡迎加入</h1>
              <p style="font-size: 18px; margin: 10px 0;">Singple 教育機構管理系統</p>
            </div>
            <div class="content">
              <p>親愛的 <strong>${toName}</strong>，您好：</p>

              <p>您的帳號已成功建立！以下是您的登入資訊：</p>

              <div class="password-box">
                <p style="margin: 0 0 10px 0; color: #666;">臨時密碼</p>
                <p class="password">${tempPassword}</p>
              </div>

              <div class="warning">
                <strong>⚠️ 重要提醒：</strong>
                <ul style="margin: 10px 0;">
                  <li>此為系統自動生成的臨時密碼</li>
                  <li>首次登入時，系統會要求您修改密碼</li>
                  <li>請妥善保管密碼，不要分享給他人</li>
                </ul>
              </div>

              <div style="text-align: center;">
                <a href="${process.env.APP_URL || 'https://singple-ai-system.zeabur.app'}/login" class="btn">
                  立即登入系統
                </a>
              </div>

              <h3>📝 登入步驟：</h3>
              <ol>
                <li>點擊上方「立即登入系統」按鈕</li>
                <li>輸入您的 Email：<strong>${toEmail}</strong></li>
                <li>輸入臨時密碼（見上方密碼框）</li>
                <li>首次登入後，設定您的新密碼</li>
              </ol>

              <div class="footer">
                <p>如有任何問題，請聯絡系統管理員</p>
                <p>© ${new Date().getFullYear()} Singple 教育機構管理系統</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      // 純文字版本（給不支援 HTML 的 Email 客戶端）
      text: `
親愛的 ${toName}，您好：

您的帳號已成功建立！以下是您的登入資訊：

Email: ${toEmail}
臨時密碼: ${tempPassword}

⚠️ 重要提醒：
- 此為系統自動生成的臨時密碼
- 首次登入時，系統會要求您修改密碼
- 請妥善保管密碼，不要分享給他人

登入網址：${process.env.APP_URL || 'https://singple-ai-system.zeabur.app'}/login

如有任何問題，請聯絡系統管理員。

© ${new Date().getFullYear()} Singple 教育機構管理系統
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log('[Email Service] ✅ Email 發送成功:', info.messageId);
    console.log('[Email Service] 收件人:', toEmail);

    return { success: true };
  } catch (error: any) {
    console.error('[Email Service] ❌ Email 發送失敗:', error);
    return {
      success: false,
      error: error.message || '發送失敗',
    };
  }
}

/**
 * 發送密碼重設通知 Email
 */
export async function sendPasswordResetEmail(
  toEmail: string,
  toName: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = createTransporter();

    if (!transporter) {
      console.log('[Email Service] Email 功能未啟用，跳過發送');
      return {
        success: false,
        error: 'Email 服務未設定',
      };
    }

    const mailOptions = {
      from: `"Singple 教育機構管理系統" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: '🔐 您的密碼已重設',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .password-box { background: #fff; border: 2px solid #f5576c; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
            .password { font-size: 24px; font-weight: bold; color: #f5576c; letter-spacing: 2px; font-family: 'Courier New', monospace; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .btn { display: inline-block; background: #f5576c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 密碼已重設</h1>
            </div>
            <div class="content">
              <p>親愛的 <strong>${toName}</strong>，您好：</p>

              <p>管理員已為您重設密碼。新的臨時密碼如下：</p>

              <div class="password-box">
                <p style="margin: 0 0 10px 0; color: #666;">新密碼</p>
                <p class="password">${newPassword}</p>
              </div>

              <div class="warning">
                <strong>⚠️ 安全提醒：</strong>
                <ul style="margin: 10px 0;">
                  <li>請立即登入並修改為您自己的密碼</li>
                  <li>登入後系統會要求您更改密碼</li>
                  <li>請妥善保管密碼，不要分享給他人</li>
                </ul>
              </div>

              <div style="text-align: center;">
                <a href="${process.env.APP_URL || 'https://singple-ai-system.zeabur.app'}/login" class="btn">
                  立即登入系統
                </a>
              </div>

              <div class="footer">
                <p>如有任何問題，請聯絡系統管理員</p>
                <p>© ${new Date().getFullYear()} Singple 教育機構管理系統</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
親愛的 ${toName}，您好：

管理員已為您重設密碼。新的臨時密碼如下：

新密碼: ${newPassword}

⚠️ 安全提醒：
- 請立即登入並修改為您自己的密碼
- 登入後系統會要求您更改密碼
- 請妥善保管密碼，不要分享給他人

登入網址：${process.env.APP_URL || 'https://singple-ai-system.zeabur.app'}/login

如有任何問題，請聯絡系統管理員。

© ${new Date().getFullYear()} Singple 教育機構管理系統
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log('[Email Service] ✅ 密碼重設 Email 發送成功:', info.messageId);

    return { success: true };
  } catch (error: any) {
    console.error('[Email Service] ❌ Email 發送失敗:', error);
    return {
      success: false,
      error: error.message || '發送失敗',
    };
  }
}
