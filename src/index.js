import { BaseException } from '@directus/exceptions';

export class InvalidRolesException extends BaseException {
	constructor(message = 'Invalid user roles') {
		super(message, 403, 'INVALID_ROLES');
	}
}

export class AuthMissingRolesException extends InvalidRolesException {
	constructor(message = 'User token does not have any roles assigned') {
		super(message, 403, 'AUTH_ROLES_MISSING');
	}
}

export class NoMatchingRolesException extends InvalidRolesException {
	constructor(message = 'User role from token does not match any known roles') {
		super(message, 403, 'AUTH_ROLE_NOT_FOUND');
	}
}

const tokenRoleFilter = async(
      payload,
      rolesService, 
      updateType, 
      { provider, providerPayload: { accessToken, userInfo } }, 
      env
) => {
  // get role name from token
  const prefix = `AUTH_${provider.toUpperCase()}`
  const claimName = env[`${prefix}_CLAIM_NAME`] || 'directus_role';
  let tokenRoles = userInfo?.[claimName];
  tokenRoles = tokenRoles && !Array.isArray(tokenRoles) ? [tokenRoles] : tokenRoles;
  console.log(payload, userInfo, claimName, tokenRoles);

  // check if user has any roles assigned
  if (!tokenRoles?.length) {
    throw new AuthMissingRolesException(`User does not have a role assigned (key: ${claimName})`)
  }

  // find role id by name
  const roles = await rolesService.readByQuery({
    filter: { name: { _in: tokenRoles } },
  });

  // check if it matches any directus roles
  if (!roles || roles.length < 1) {
    throw new NoMatchingRolesException(`The user role(s) '${tokenRoles.join(', ')}' do not match any known roles`)
  }

  // build user overrides
  let overwriteUserFields = env[`${prefix}_OVERWRITE_USER_FIELDS`] || null;
  let overwriteUserInfo = env[`${prefix}_OVERWRITE_USER_INFO`] || overwriteUserFields; //env[`${prefix}_OVERWRITE_USER_INFO`];
  if(overwriteUserInfo !== updateType) {
    overwriteUserInfo = false;
  }

  // build user payload
  let update = null;
  if(overwriteUserInfo) {
    update = overwriteUserFields?.reduce((o, field) => {
      let [ old, new_ ] = field.split(':');
      old = old.trim();
      new_ = new_?.trim() || old;
      o[new_] = userInfo[old];
      return o;
    }, {});
  }

  // return user payload
  return { ...payload, ...update, role: roles[0].id };
}

export default ({ filter }, { services: { RolesService }, env }) => {
  const handler = (updateType) => (
    async (payload, meta, { schema, database }) => {
      const rolesService = await new RolesService({ schema, knex: database });
      return await tokenRoleFilter(payload, rolesService, updateType, meta, env);
    }
  )

  filter('auth.create', handler('create'));
  filter('auth.update', handler('update'));
};
