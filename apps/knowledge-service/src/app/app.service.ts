import { Injectable } from '@nestjs/common';
@Injectable()
export class AppService {
  getData() { return { service: 'knowledge-service', phase: 2 }; }
}
