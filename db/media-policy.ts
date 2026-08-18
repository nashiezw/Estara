export const MEDIA_TYPES={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"} as const;
export const MAX_MEDIA_BYTES=12*1024*1024;
export type MediaKind="agency_logo"|"property_photo";
export function validateMediaFile(file:{type:string;size:number}){if(!(file.type in MEDIA_TYPES))return "Use a JPG, PNG or WebP image.";if(file.size<1||file.size>MAX_MEDIA_BYTES)return "Images must be smaller than 12 MB.";return null}
export function mediaObjectKey(agencyId:string,assetId:string,mime:string){const ext=MEDIA_TYPES[mime as keyof typeof MEDIA_TYPES];if(!ext)throw new Error("Unsupported media type");return `tenants/${agencyId}/media/${assetId}.${ext}`}
export function safeDownloadName(value:string){return (value||"image").replace(/[^a-z0-9._-]+/gi,"-").replace(/^-+|-+$/g,"").slice(0,100)||"image"}
