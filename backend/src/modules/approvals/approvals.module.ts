import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApprovalsService } from './approvals.service';
import { ApprovalsController } from './approvals.controller';
import { ApprovalWorkflow, ApprovalWorkflowSchema } from './entities/approval-workflow.entity';
import { ApprovalStep, ApprovalStepSchema } from './entities/approval-step.entity';
import { Estimation, EstimationSchema } from '../estimations/entities/estimation.entity';
import { User, UserSchema } from '../users/entities/user.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ApprovalWorkflow.name, schema: ApprovalWorkflowSchema },
      { name: ApprovalStep.name, schema: ApprovalStepSchema },
      { name: Estimation.name, schema: EstimationSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [ApprovalsController],
  providers: [ApprovalsService],
  exports: [ApprovalsService],
})
export class ApprovalsModule {}

