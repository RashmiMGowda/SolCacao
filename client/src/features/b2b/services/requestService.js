import { getAuthMode, getStoredSession, listBusinessAccounts as listAuthAccounts, updateBusinessApproval } from '../../auth/services/authService'
import { createLocalRequestService } from './localRequestService'

const local = createLocalRequestService({ getSession: getStoredSession, getStorage: () => window.localStorage, listAccounts: listAuthAccounts, approveAccount: updateBusinessApproval })
const isLocal = () => getAuthMode() !== 'api'
const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/+$/, '')
const sessionChanged = () => new Error('Your session changed. Sign in and try again.')
async function api(path, options = {}, token = localStorage.getItem('solcacao.jwt')) {
  if (!token) throw new Error('Sign in using the connected business account to continue.')
  if (token !== localStorage.getItem('solcacao.jwt')) throw sessionChanged()
  const response = await fetch(`${baseUrl}/b2b${path}`, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } })
  if (token !== localStorage.getItem('solcacao.jwt')) throw sessionChanged()
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    const error = new Error(payload.error?.message || 'Unable to complete the request. Please try again.')
    error.details = payload.error?.details || {}
    throw error
  }
  return response
}
function encodeFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve({ name: file.name, type: file.type, data: reader.result.split(',')[1] })
    reader.onerror = () => reject(new Error('Unable to read the attachment. Choose the file again.'))
    reader.readAsDataURL(file)
  })
}
export async function submitRequest(form, requestId) {
  const localMode = isLocal()
  const session = localMode ? (await getStoredSession())?.id : localStorage.getItem('solcacao.jwt')
  const { designFiles, ...values } = form
  const attachments = await Promise.all(designFiles.map(encodeFile))
  if (localMode) {
    if (session !== (await getStoredSession())?.id) throw sessionChanged()
    return local.submit({ ...values, quantityKg: Number(values.quantityKg) }, requestId, attachments)
  }
  return (await (await api('/requests', { method: 'POST', body: JSON.stringify({ ...values, quantityKg: Number(values.quantityKg), requestId, attachments }) }, session)).json()).request
}
export async function listRequests() { return isLocal() ? local.list() : (await (await api('/requests')).json()).requests }
export async function getRequest(id) { return isLocal() ? local.get(id) : (await (await api(`/requests/${id}`)).json()).request }
export async function changeRequest(id, action, values = {}) { return isLocal() ? local.change(id, action, values) : (await (await api(`/requests/${id}/${action}`, { method: 'POST', body: JSON.stringify(values) })).json()).request }
export async function listBusinessAccounts() { return isLocal() ? local.accounts() : (await (await api('/accounts')).json()).accounts }
export async function approveBusiness(id, status, reason) { return isLocal() ? local.approve(id, status, reason) : (await (await api(`/accounts/${id}/approval`, { method: 'POST', body: JSON.stringify({ status, reason }) })).json()).account }
export async function downloadAttachment(requestId, file) {
  let blob
  if (isLocal()) {
    const request = await local.get(requestId)
    const saved = request.files.find((item) => item.id === file.id)
    if (!saved) throw new Error('Attachment not found.')
    blob = new Blob([Uint8Array.from(atob(saved.data), (character) => character.charCodeAt(0))], { type: 'application/octet-stream' })
  } else blob = await (await api(`/requests/${requestId}/files/${file.id}`)).blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = file.originalFilename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
