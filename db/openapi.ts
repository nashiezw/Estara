export const openApiSpec = {
  openapi: "3.1.0",
  info: { title: "Estara Connect Public API", version: "1.0.0", description: "Tenant-scoped API for properties, contacts, enquiries, viewings, bookings and webhooks." },
  servers: [{ url: "https://app.estara.co.zw" }],
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "est_live_*" } },
    schemas: {
      Error: { type: "object", properties: { error: { type: "string" } } },
      ContactWrite: { type: "object", required: ["fullName"], properties: { fullName: { type: "string" }, phone: { type: "string" }, email: { type: "string" }, roles: { type: "array", items: { enum: ["buyer", "tenant", "seller", "landlord", "investor", "developer"] } }, requirements: { type: "string" }, notes: { type: "string" }, fieldMap: { type: "object" } } },
      PropertyWrite: { type: "object", required: ["title", "location"], properties: { title: { type: "string" }, location: { type: "string" }, priceMinor: { type: "integer" }, currency: { type: "string", default: "USD" }, transactionType: { type: "string" }, propertyType: { type: "string" }, fieldMap: { type: "object" } } },
      EnquiryWrite: { type: "object", required: ["fullName"], properties: { propertyId: { type: "string" }, fullName: { type: "string" }, phone: { type: "string" }, email: { type: "string" }, requirements: { type: "string" }, fieldMap: { type: "object" } } },
      ViewingWrite: { type: "object", required: ["propertyId", "startsAt", "endsAt"], properties: { propertyId: { type: "string" }, contactId: { type: "string" }, startsAt: { type: "string", format: "date-time" }, endsAt: { type: "string", format: "date-time" }, notes: { type: "string" }, fieldMap: { type: "object" } } },
      BookingWrite: { type: "object", required: ["propertyId", "fullName", "startsAt"], properties: { propertyId: { type: "string" }, fullName: { type: "string" }, phone: { type: "string" }, email: { type: "string" }, startsAt: { type: "string", format: "date-time" }, fieldMap: { type: "object" } } },
      WebhookSubscription: { type: "object", required: ["name", "url", "events"], properties: { name: { type: "string" }, url: { type: "string", format: "uri" }, events: { type: "array", items: { type: "string" } } } }
    },
    responses: { BadRequest: { description: "Validation or scope error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } } }
  },
  paths: {
    "/api/v1/properties": { get: { summary: "List properties", security: [{ bearerAuth: [] }] }, post: { summary: "Create property", security: [{ bearerAuth: [] }], requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/PropertyWrite" } } } } } },
    "/api/v1/properties/{id}": { get: { summary: "Read property" }, patch: { summary: "Update property" } },
    "/api/v1/properties/{id}/media": { post: { summary: "Upload optimized property media" } },
    "/api/v1/contacts": { post: { summary: "Create or update contact", requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/ContactWrite" } } } } } },
    "/api/v1/enquiries": { get: { summary: "List enquiries" }, post: { summary: "Create enquiry", requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/EnquiryWrite" } } } } } },
    "/api/v1/viewings": { get: { summary: "List viewings" }, post: { summary: "Create viewing request", requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/ViewingWrite" } } } } } },
    "/api/v1/viewings/{id}": { patch: { summary: "Move a viewing through permitted statuses" } },
    "/api/v1/bookings": { post: { summary: "Public booking convenience endpoint", requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/BookingWrite" } } } } } },
    "/api/v1/webhooks": { get: { summary: "List webhook subscriptions and recent delivery evidence" }, post: { summary: "Create webhook subscription", requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/WebhookSubscription" } } } } }, delete: { summary: "Disable webhook subscription" } }
  },
  "x-estara": {
    scopes: ["properties:read", "properties:write", "properties:media:write", "contacts:write", "enquiries:read", "enquiries:write", "viewings:read", "viewings:write", "bookings:write", "webhooks:manage"],
    errors: { 400: "Validation failed, missing scope, rate limit, IP allowlist or invalid credential.", 401: "Missing or invalid bearer token.", 403: "Authenticated user cannot manage this tenant.", 422: "Business rule rejected the transition or payload." },
    webhookSignature: "Compute HMAC-SHA256 over the raw request body with the webhook signing secret. Compare to x-estara-signature after the sha256= prefix using constant-time comparison."
  }
} as const;
