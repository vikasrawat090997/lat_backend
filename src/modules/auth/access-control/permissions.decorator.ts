import { CustomDecorator, SetMetadata } from '@nestjs/common';
import { PermissionObjectType } from './casl-ability.factory';
import { ActionsSuperSet } from 'src/utils/enums';
import { permissionCheckKey } from 'src/constants/constants';

// action, object
export type RequiredPermission = [ActionsSuperSet, PermissionObjectType];

export const CheckPermissions = (
  ...params: RequiredPermission[]
): CustomDecorator<string> => {
  return SetMetadata(permissionCheckKey, params);
};
