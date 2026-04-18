import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpensesService } from './expenses.service';

@UseGuards(JwtAuthGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  create(
    @Req() req: { user: { id: string } },
    @Body() createExpenseDto: CreateExpenseDto,
  ) {
    return this.expensesService.create(req.user.id, createExpenseDto);
  }

  @Get()
  findAll(@Req() req: { user: { id: string } }) {
    return this.expensesService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.expensesService.findOne(req.user.id, id);
  }

  @Patch(':id')
  update(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() updateExpenseDto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(req.user.id, id, updateExpenseDto);
  }

  @Delete(':id')
  remove(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.expensesService.remove(req.user.id, id);
  }
}
