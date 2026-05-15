import { Ability } from '@casl/ability';
import { Injectable } from '@nestjs/common';
import { AccessControlService } from './access-control.service';
import { ActionsSuperSet } from 'src/utils/enums';

export type PermissionObjectType = any;
export type AppAbility = Ability<[ActionsSuperSet, PermissionObjectType]>;
interface CaslPermission {
  action: ActionsSuperSet;
  subject: string; // In our database these are called entities but in CASL they are called "subject"
}

@Injectable()
export class CaslAbilityFactory {
  constructor(private accessControlService: AccessControlService) {}

  async createForUser(user: any): Promise<AppAbility> {
    const permissions =
      this.accessControlService.findAllPermissionsOfUser(user);
    const caslPermissions: CaslPermission[] = permissions.map((cur) => {
      const temp = cur.split('-');
      return {
        action: temp[1],
        subject: temp[0],
      };
    });
    return new Ability<[ActionsSuperSet, PermissionObjectType]>(
      caslPermissions,
    );
  }
}
