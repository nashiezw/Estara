UPDATE platform_settings
SET tenant_domain_suffix='estara.co.zw',
    updated_at=CURRENT_TIMESTAMP
WHERE tenant_domain_suffix='' OR tenant_domain_suffix='sites.estara.co.zw';
--> statement-breakpoint
UPDATE custom_domains
SET expected_cname=replace(expected_cname,'.sites.estara.co.zw','.estara.co.zw'),
    updated_at=CURRENT_TIMESTAMP
WHERE expected_cname LIKE '%.sites.estara.co.zw';
