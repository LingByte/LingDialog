import CryptoJS from 'crypto-js'

/**
 * 加密密码（使用MD5，仅用于演示，生产环境应使用更安全的加密方式）
 */
export function encryptPassword(password: string): string {
  return CryptoJS.MD5(password).toString()
}

/**
 * 加密密码为字符串（别名）
 */
export function encryptPasswordToString(password: string): string {
  return encryptPassword(password)
}

/**
 * 验证密码
 */
export function verifyPassword(password: string, encryptedPassword: string): boolean {
  return encryptPassword(password) === encryptedPassword
}

