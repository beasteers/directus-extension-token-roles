# Directus Extension: Map roles from OIDC token to Directus roles.

Problem: Directus does not automatically pull user roles assigned in the OIDC token.

Solution: Hook into the token checking process and inject the user roles (and possibly update other information).

## Install
```bash
npm install directus-extension-token-roles
```

## Usage
Default values.
```bash
# the key in the OIDC token that the role is placed under
AUTH_${PROVIDER}_CLAIM_NAME=directus_role
# a mapping claims to copy from the OIDC token to the Directus user database
# e.g. "given_name:first_name, family_name:last_name"
AUTH_${PROVIDER}_OVERWRITE_USER_FIELDS=
```

### Keycloak
I've only tested this with Keycloak, but it in theory should work for any OIDC provider.

First, you must setup keycloak:
 - create a client in keycloak
 - create a client role protocol mapper
    - It only worked if I set the data type to multivalued STRING. 
    - I think there might be a bug in how directus parses token claims
      which makes it throw an exception when one is an array, but I'm not certain. I just know the JSON type doesn't work.
 - create a client role with the same name as the directus roles (e.g. Administrator) and add it to your user

For a full example, see `docker-compose.yaml`.

Then to configure this extension: (e.g. where PROVIDER=KEYCLOAK)

For hints on other providers, see the [SSO docs](https://docs.directus.io/self-hosted/sso-examples.html) in directus.
```bash
# using a multivalued string with the claim name "directus_role"
# places it under this key (with .0 as a suffix).
AUTH_${PROVIDER}_CLAIM_NAME=directus_role.0
# Use this to map claims from the OIDC token to directus fields.
AUTH_${PROVIDER}_OVERWRITE_USER_FIELDS="given_name:first_name, family_name:last_name"
```

Here's an example of the OIDC payload (the destination)
```javascript
{
  exp: 1684068573,
  iat: 1684067973,
  auth_time: 1684067973,
  typ: 'ID',
  acr: '1',
  aud: 'directus',
  azp: 'directus',
  iss: 'https://auth.mydomain/realms/master',
  jti: 'af12b2ba-7604-4041-851a-eae3b17c9a82',
  sub: 'af12b2ba-7604-4041-851a-eae3b17c9a82',
  session_state: 'af12b2ba-7604-4041-851a-eae3b17c9a82',
  sid: 'af12b2ba-7604-4041-851a-eae3b17c9a82',
  nonce: 'dds-eae3b17c9a82-eae3b17c9a82eae3b17c9a82eaz',
  at_hash: 'eae3b17c9a82eae3b17c9a',
  email_verified: true,
  name: 'My Name',
  preferred_username: 'asdf',
  given_name: 'My',
  'directus_role.0': 'Administrator',
  family_name: 'Name',
  email: 'me@gmail.com'
}
```

Here's an example of the directus payload (the destination)
```javascript
{
  provider: 'keycloak',
  first_name: 'me',
  last_name: 'me',
  email: 'me@gmail.com',
  external_identifier: 'me@gmail.com',
  role: undefined,
  auth_data: '{"refreshToken":"eyJhbG..."}'
}
```
There may be ways to specify more information (e.g. profile picture?). Feel free to 
update this illustrating more fields that you're allowed to set.

| A note about the payloads: Directus doesn't really do usernames, it all has to be emails.