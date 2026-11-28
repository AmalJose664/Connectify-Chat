import axios from 'axios'
import { useAuthStore } from '../store/useAuthStore'

//------------------------------------------------------------------
// Backend configuration

const RAW_API_URL = import.meta.env.VITE_API_BASE_URL

if (!RAW_API_URL) {
    throw new Error('VITE_API_BASE_URL is not set (e.g. http://localhost:8000)')
}

// Full URL with scheme, no trailing slash. Used only by axios in this file.
const API_BASE_URL = RAW_API_URL.replace(/\/+$/, '')

const backendUrl = new URL(API_BASE_URL)

export const proto = backendUrl.protocol.replace(':', '')      // http | https
export const wsProto = proto === 'https' ? 'wss' : 'ws'        // ws | wss

// Host only, NO scheme (e.g. localhost:8000 or xyz.onrender.com).
// Existing code builds `${wsProto}://${ip}/...`, so this now gives a valid URL.
export const ip = backendUrl.host + backendUrl.pathname.replace(/\/+$/, '')

//------------------------------------------------------------------
// Instance factory

const attachToken = (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
}

const createInstance = (path, { auth = true } = {}) => {
    const instance = axios.create({
        baseURL: `${API_BASE_URL}${path}`,
        withCredentials: true,
    })
    if (auth) instance.interceptors.request.use(attachToken)
    return instance
}

const handleUnauthorized = (instance) => {
    instance.interceptors.response.use(
        (response) => response,
        (error) => {
            if (
                error.response?.status === 401 &&
                error.response?.data?.code === 'token_not_valid'
            ) {
                localStorage.removeItem('access_token')
                console.log('should log out')
                useAuthStore.getState().axiosLogout()
            }
            return Promise.reject(error)
        }
    )
}

//------------------------------------------------------------------
// Instances (same names as before)

export const axiosApiInstance = createInstance('/api/friends')
export const axiosAuthInstance = createInstance('/api/auth', { auth: false })
export const axiosMessageInstance = createInstance('/api/messages')
export const axiosGroupsInstance = createInstance('/api/groups')
export const axiosSpecialAuthInstance = createInstance('/api/auth')

handleUnauthorized(axiosMessageInstance)
handleUnauthorized(axiosGroupsInstance)

//------------------------------------------------------------------
// Admin API

export const axiosAdminInstance = axios.create({
    baseURL: import.meta.env.VITE_API_ADMIN_URL,
    withCredentials: true,
})
