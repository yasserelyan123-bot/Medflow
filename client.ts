const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'
export async function api<T>(path:string, options:RequestInit={}):Promise<T>{
 const r=await fetch(`${API_BASE_URL}${path}`,{headers:{'Content-Type':'application/json',...(options.headers||{})},...options})
 if(!r.ok) throw new Error(await r.text())
 return r.json()
}
export default API_BASE_URL
