import { Body, Controller, Get, Patch, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { ChangeOwnPasswordDto, LoginDto, RegisterDto, RefreshDto } from "./auth.dto";
import { CurrentUser, RequestUser } from "../common/decorators";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post("refresh")
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Get("me")
  @UseGuards(AuthGuard("jwt"))
  @ApiBearerAuth()
  me(@CurrentUser() user: RequestUser) {
    return this.authService.me(user.sub);
  }

  @Patch("me/password")
  @UseGuards(AuthGuard("jwt"))
  @ApiBearerAuth()
  changePassword(@CurrentUser() user: RequestUser, @Body() dto: ChangeOwnPasswordDto) {
    return this.authService.changeOwnPassword(user.sub, dto);
  }
}
