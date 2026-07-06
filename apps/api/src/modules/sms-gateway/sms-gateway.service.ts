import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface SmsMessage {
  to: string;
  text: string;
  language: "bn" | "en";
}

export class SmsGatewayService {
  async send(message: SmsMessage): Promise<{ success: boolean; messageId?: string }> {
    const provider = process.env.SMS_PROVIDER ?? "mock";

    switch (provider) {
      case "twilio":
        return this.sendViaTwilio(message);
      case "vonage":
        return this.sendViaVonage(message);
      case "mock":
      default:
        return this.sendViaMock(message);
    }
  }

  private async sendViaTwilio(message: SmsMessage): Promise<{ success: boolean; messageId?: string }> {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const from = process.env.TWILIO_FROM_NUMBER;

      if (!accountSid || !authToken || !from) {
        throw new Error("Twilio credentials not configured");
      }

      const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: message.to,
            From: from,
            Body: message.text,
          }),
        }
      );

      const data = await res.json();
      return { success: res.ok, messageId: data.sid };
    } catch (err) {
      console.error("[sms-gateway] Twilio error:", err);
      return { success: false };
    }
  }

  private async sendViaVonage(message: SmsMessage): Promise<{ success: boolean; messageId?: string }> {
    console.log("[sms-gateway] Vonage not implemented, falling back to mock");
    return this.sendViaMock(message);
  }

  private async sendViaMock(message: SmsMessage): Promise<{ success: boolean; messageId?: string }> {
    console.log(`[sms-gateway][mock] To: ${message.to} | Text: ${message.text.substring(0, 60)}...`);
    return { success: true, messageId: `mock-${Date.now()}` };
  }

  async sendAdvisory(params: {
    phone: string;
    farmerName: string;
    advice: string;
    language: "bn" | "en";
  }) {
    const prefix = params.language === "bn" ? "পরামর্শ:" : "Advice:";
    const text = `${prefix} ${params.advice}`;
    return this.send({ to: params.phone, text, language: params.language });
  }

  async sendVerificationResult(params: {
    phone: string;
    productName: string;
    verified: boolean;
    language: "bn" | "en";
  }) {
    let text: string;
    if (params.language === "bn") {
      text = params.verified
        ? `${params.productName} পণ্যটি খাঁটি ও বৈধ।`
        : `${params.productName} পণ্যটি জাল হতে পারে! দয়া করে ডিলারকে জানান।`;
    } else {
      text = params.verified
        ? `${params.productName} is authentic and verified.`
        : `${params.productName} may be counterfeit! Please notify your dealer.`;
    }
    return this.send({ to: params.phone, text, language: params.language });
  }

  async sendComplaintUpdate(params: {
    phone: string;
    complaintId: string;
    status: string;
    language: "bn" | "en";
  }) {
    let text: string;
    if (params.language === "bn") {
      text = `আপনার অভিযোগ #${params.complaintId.substring(0, 8)} এর অবস্থা: ${params.status}`;
    } else {
      text = `Your complaint #${params.complaintId.substring(0, 8)} status: ${params.status}`;
    }
    return this.send({ to: params.phone, text, language: params.language });
  }
}
