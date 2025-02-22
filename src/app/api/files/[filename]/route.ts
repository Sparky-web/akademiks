import { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import { NextResponse } from 'next/server'

export async function GET(req: NextApiRequest, props: { params: Promise<{ filename: string }> }) {
  const params = await props.params;
  const { filename } = params
  console.log(filename)
  const filePath = path.join(process.cwd(), '/files/', filename as string)

  if (fs.existsSync(filePath)) {
    const fileStream = fs.createReadStream(filePath)
    // fileStream.pipe(res)
    return new NextResponse(fileStream)
  } else {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
}