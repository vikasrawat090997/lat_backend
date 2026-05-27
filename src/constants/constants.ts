export const envList = ['.env', '.env.development', '.env.staging'];

export const permissionCheckKey =
  'd73e13b96de08d8b4aee891dc6be97621980e40928d992ca1db964121317e590';

export const swaggerTitle = 'Solar API';

export const bannerImageSize = 3;
export const bannerDesciptionBase64Size = 7; // Not more than 7 mb all base 64 image in description
export const bannerDesciptionImageSize = 3; // Not more than 3 mb a single base 64 image

export const adminEmailTemplate = (data: any) => `
  <div style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px 0;">
      <tr>
        <td align="center">
          
          <!-- Main Container -->
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
            
            <!-- Header -->
            <tr>
              <td style="background:#0d6efd;padding:20px;text-align:center;">
                <h2 style="color:#ffffff;margin:0;">New Form Submission</h2>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:30px;">
                
                <p style="font-size:14px;color:#333;margin-bottom:20px;">
                  Dear Sir/Mam,
                </p>

                <p style="font-size:14px;color:#555;margin-bottom:25px;">
                  A new user has submitted the <strong>"Join Us"</strong> form. Please find the details below:
                </p>

                <!-- Details Table -->
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="padding:10px;border:1px solid #eee;background:#fafafa;"><strong>Full Name</strong></td>
                    <td style="padding:10px;border:1px solid #eee;">${data.name}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px;border:1px solid #eee;background:#fafafa;"><strong>Email</strong></td>
                    <td style="padding:10px;border:1px solid #eee;">${data.email}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px;border:1px solid #eee;background:#fafafa;"><strong>Phone</strong></td>
                    <td style="padding:10px;border:1px solid #eee;">${data.phone}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px;border:1px solid #eee;background:#fafafa;"><strong>Interest</strong></td>
                    <td style="padding:10px;border:1px solid #eee;">${data.interest_label}</td>
                  </tr>
                </table>

                <!-- CTA -->
              

                <p style="font-size:13px;color:#777;">
                  Please review this submission and take the necessary action.
                </p>

                <p style="font-size:14px;color:#333;margin-top:30px;">
                  Regards,<br/>
                  <strong>CAA Team</strong>
                </p>

              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background:#f8f9fa;padding:15px;text-align:center;font-size:12px;color:#999;">
                This is an automated notification. Please do not reply.
              </td>
            </tr>

          </table>

        </td>
      </tr>
    </table>
  </div>
`;
