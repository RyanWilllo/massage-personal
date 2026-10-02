import { initialState } from '../domain/defaults.js'

export const DATABASE_NAME = 'massage-personal'
export const DATABASE_VERSION = 1
let connection

export function openDatabase() {
  if (connection) return connection
  connection = new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) { reject(new Error('当前浏览器不支持本地保存，请使用 Safari')); return }
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('state')) request.result.createObjectStore('state')
    }
    request.onblocked = () => { connection = null; reject(new Error('请关闭其他应用窗口后重试')) }
    request.onerror = () => { connection = null; reject(new Error('本地数据库无法打开，请检查手机存储空间')) }
    request.onsuccess = () => {
      const db = request.result
      db.onversionchange = () => { db.close(); connection = null }
      db.onclose = () => { connection = null }
      resolve(db)
    }
  })
  return connection
}

// One atomic state record serializes mutations across all tabs. Domain callbacks
// must be synchronous so Safari cannot auto-close a transaction between awaits.
export async function transaction(mutate, mode = 'readwrite') {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('state', mode)
    const store = tx.objectStore('state')
    let result, failure
    const request = store.get('personal')
    request.onsuccess = () => {
      try {
        const state = request.result ?? initialState()
        result = mutate(state)
        if (result?.then) throw new Error('数据库事务不能执行异步业务操作')
        if (mode === 'readwrite') store.put(state, 'personal')
      } catch (error) { failure = error; tx.abort() }
    }
    tx.oncomplete = () => resolve(result)
    tx.onabort = tx.onerror = () => reject(failure ?? new Error(
      tx.error?.name === 'QuotaExceededError' ? '手机存储空间不足，记录未保存' : '保存失败，原有数据未改变，请重试'))
  })
}
export const readState = () => transaction(state => state, 'readonly')

export async function closeDatabase() {
  if (connection) (await connection).close()
  connection = null
}
