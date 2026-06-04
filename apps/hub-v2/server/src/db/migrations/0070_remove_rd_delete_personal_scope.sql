UPDATE personal_api_tokens
SET scopes_json = (
  SELECT COALESCE(json_group_array(value), '[]')
  FROM json_each(
    CASE
      WHEN json_valid(personal_api_tokens.scopes_json) THEN personal_api_tokens.scopes_json
      ELSE '[]'
    END
  )
  WHERE value <> 'rd:delete:write'
)
WHERE scopes_json LIKE '%rd:delete:write%';
