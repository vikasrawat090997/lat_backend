import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthService } from './AuthServiceAuthGuard';

@Injectable()
export class JwtDatabaseAuthGuard
  extends AuthGuard('jwt')
  implements CanActivate
{
  constructor(
    private reflector: Reflector,
    private authService: AuthService, // Inject the service to check the token
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.headers.authorization?.split(' ')[1]; // Extract token from Authorization header

    if (!token) {
      throw new UnauthorizedException('Token is missing');
    }

    // Verify token from the database
    const isTokenValid = await this.authService.validateToken(token);
    if (!isTokenValid) {
      throw new UnauthorizedException('Invalid token');
    }

    return super.canActivate(context) as Promise<boolean>;
  }
}
