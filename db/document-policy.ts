const TYPES:Record<string,{ext:string;magic:(b:Uint8Array)=>boolean}>={
  "application/pdf":{ext:"pdf",magic:b=>String.fromCharCode(...b.slice(0,5))==="%PDF-"},
  "image/jpeg":{ext:"jpg",magic:b=>b[0]===0xff&&b[1]===0xd8&&b[2]===0xff},
  "image/png":{ext:"png",magic:b=>[137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v)},
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":{ext:"docx",magic:b=>b[0]===0x50&&b[1]===0x4b},
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":{ext:"xlsx",magic:b=>b[0]===0x50&&b[1]===0x4b},
};
export const MAX_DOCUMENT_BYTES=20*1024*1024;
export async function validateDocument(file:File){const type=TYPES[file.type];if(!type)return "Use a PDF, DOCX, XLSX, JPG or PNG file.";if(file.size<4||file.size>MAX_DOCUMENT_BYTES)return "Files must be between 4 bytes and 20 MB.";const bytes=new Uint8Array(await file.slice(0,16).arrayBuffer());if(!type.magic(bytes))return "The file contents do not match its declared type.";return null}
export function documentObjectKey(agencyId:string,id:string,mime:string){return `tenants/${agencyId}/documents/${id}.${TYPES[mime]?.ext||"bin"}`}
export function downloadName(value:string){return value.replace(/[^a-zA-Z0-9._ -]/g,"_").slice(0,120)||"document"}
export async function tokenHash(token:string){const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token));return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,"0")).join("")}
