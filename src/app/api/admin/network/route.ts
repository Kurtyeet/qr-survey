import { NextResponse } from 'next/server';
import os from 'os';

export const dynamic = 'force-dynamic';

export async function GET() {
  const nets = os.networkInterfaces();
  const ips: { iface: string; ip: string }[] = [];

  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push({ iface: name, ip: net.address });
      }
    }
  }

  // Prefer Wi-Fi or 192.168.x.x addresses typical of hotspots
  const preferred =
    ips.find((i) => i.iface.toLowerCase().includes('wi-fi') || i.iface.toLowerCase().includes('wlan')) ||
    ips.find((i) => i.ip.startsWith('192.168.')) ||
    ips[0];

  return NextResponse.json({
    ips,
    defaultIp: preferred ? preferred.ip : 'localhost',
    port: process.env.PORT || 3000,
  });
}
