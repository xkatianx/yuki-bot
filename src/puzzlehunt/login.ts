import axios from 'axios'
import { fatal } from '../misc/cli.js'

export interface tokens {
  csrftoken: string
  sessionid: string
}

export async function gphLogin (
  website: string,
  username: string,
  password: string
): Promise<tokens> {
  const loginUrl = new URL('login', website).href
  const res = await axios.get(loginUrl)

  const cookie = res.headers['set-cookie']
  const csrftoken1 = cookie
    ?.join(';')
    .match(/csrftoken=(\w+)/)
    ?.at(1)

  const data = res.data as string
  const csrfmiddlewaretoken = data
    .match(/name="csrfmiddlewaretoken" ?value="(\w+)"/)
    ?.at(1)
  if (csrfmiddlewaretoken == null || csrftoken1 == null) {
    throw new Error('Failed to login')
  }

  const config = {
    headers: {
      Cookie: `csrftoken=${csrftoken1}`,
      Referer: loginUrl,
      connection: 'keep-alive'
    },
    credentials: true,
    maxRedirects: 0
  }
  const payload = [
    `csrfmiddlewaretoken=${csrfmiddlewaretoken}`,
    `username=${username}`,
    `password=${password}`
  ].join('&')
  let csrftoken = ''
  let sessionid = ''
  try {
    const res2 = await axios.post(loginUrl, payload, config)
    console.log(res2.status, res2.headers)
  } catch (e: any) {
    if (e.response.status === 302) {
      const setCookies = e.response.headers['set-cookie'].join(';')
      csrftoken = setCookies.match(/csrftoken=(\w+)/)?.at(1)
      sessionid = setCookies.match(/sessionid=(\w+)/)?.at(1)
    } else fatal(e)
  }
  return { csrftoken, sessionid }
}
