import { Module } from '@nestjs/common';
import { AccessControlService } from './access-control.service';
import { CaslAbilityFactory } from './casl-ability.factory';
import { PermissionsGuard } from './permissions.guard';

@Module({
  providers: [AccessControlService, CaslAbilityFactory, PermissionsGuard],
  exports: [CaslAbilityFactory, PermissionsGuard],
})
export class AccessControlModule {}
