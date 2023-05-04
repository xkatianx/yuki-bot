import axios from 'axios'
import pkg, { Result } from 'ts-results'
const { Err, Ok } = pkg

export interface tokens {
  csrftoken: string
  sessionid: string
}

export async function gphLogin (
  website: string,
  username: string,
  password: string
): Promise<Result<tokens, Error>> {
  const loginUrl = new URL('login', website).href
  let res
  try {
    res = await axios.get(loginUrl)
  } catch (e) {
    if (e instanceof Error) return Err(e)
    else return Err(new Error('Unknown error.'))
  }

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
    return Err(new Error('Failed to login'))
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
  } catch (e) {
    if (axios.isAxiosError(e) && e.response?.status === 302) {
      const setCookies = e.response.headers['set-cookie']?.join(';')
      csrftoken = setCookies?.match(/csrftoken=(\w+)/)?.at(1) ?? ''
      sessionid = setCookies?.match(/sessionid=(\w+)/)?.at(1) ?? ''
    } else if (e instanceof Error) return Err(e)
    else return Err(new Error('Unknown error.'))
  }
  if (csrftoken === '' || sessionid === '') {
    return Err(new Error('Failed to login'))
  }
  return Ok({ csrftoken, sessionid })
}
