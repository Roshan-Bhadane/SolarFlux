export async function GET() {
  const configured = !!(
    process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID
  );
  return Response.json({ configured });
}
