import { Controller, Get, Module, Param, Query } from '@nestjs/common';
import { AuthUser, CurrentUser, Public } from '../common/auth';
import { CatalogModule, CatalogService } from '../catalog/catalog.module';

/** Group orders. Joining and leaving go through /orders (kind=batch) and /orders/:id/cancel. */
@Public()
@Controller('batches')
export class BatchesController {
  constructor(private catalog: CatalogService) {}
  @Get() list(@Query('filter') filter: string, @Query('area') area: string, @CurrentUser() u?: AuthUser) { return this.catalog.batches(filter, area, u?.id); }
  @Get(':id') get(@Param('id') id: string, @CurrentUser() u?: AuthUser) { return this.catalog.batch(id, u?.id); }
}

@Module({ imports: [CatalogModule], controllers: [BatchesController] })
export class BatchesModule {}
