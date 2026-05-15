import { Injectable } from '@nestjs/common';

@Injectable()
export class AccessControlService {
  findAllPermissionsOfUser(currentUser: any) {
    return currentUser.permissions;
  }
}
