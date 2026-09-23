import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApprovalWorkflow, ApprovalWorkflowDocument } from './entities/approval-workflow.entity';
import { ApprovalStep, ApprovalStepDocument } from './entities/approval-step.entity';
import { Estimation, EstimationDocument } from '../estimations/entities/estimation.entity';
import { User, UserDocument } from '../users/entities/user.entity';

@Injectable()
export class ApprovalsService {
  constructor(
    @InjectModel(ApprovalWorkflow.name) private wfModel:   Model<ApprovalWorkflowDocument>,
    @InjectModel(ApprovalStep.name)     private stepModel: Model<ApprovalStepDocument>,
    @InjectModel(Estimation.name)       private estModel:  Model<EstimationDocument>,
    @InjectModel(User.name)             private userModel: Model<UserDocument>,
    private events: EventEmitter2,
  ) {}

  async submit(estimationId: string, approverIds: string[], tenantId: string, userId: string) {
    const est = await this.estModel.findOne({ id: estimationId, tenantId }).lean();
    if (!est) throw new NotFoundException('Estimation not found');
    if (est.isLocked) throw new BadRequestException('Already locked');
    if (!approverIds?.length) throw new BadRequestException('At least one approver required');

    const wf = await this.wfModel.create({ tenantId, estimationId, submittedBy: userId, currentStep: 1, totalSteps: approverIds.length, status: 'pending', submittedAt: new Date() });
    const steps = approverIds.map((aid, idx) => ({ workflowId: wf.id, approverId: aid, stepNumber: idx + 1, status: idx === 0 ? 'pending' : 'waiting' }));
    await this.stepModel.insertMany(steps);

    await this.estModel.updateOne({ id: estimationId }, { $set: { status: 'under_review' } });
    this.events.emit('approval.submitted', { workflow: wf.toObject(), estimationId, tenantId });
    return wf.toObject();
  }

  async decide(workflowId: string, decision: 'approved' | 'rejected', comments: string, userId: string, tenantId: string) {
    const wf = await this.wfModel.findOne({ id: workflowId, tenantId }).lean();
    if (!wf) throw new NotFoundException('Workflow not found');
    if (wf.status !== 'pending') throw new BadRequestException('Already completed');

    const steps = await this.stepModel.find({ workflowId }).lean();
    const step = steps.find(s => s.stepNumber === wf.currentStep && s.approverId === userId);
    if (!step) throw new ForbiddenException('You are not the current approver');

    await this.stepModel.updateOne({ id: step.id }, { $set: { status: decision, comments, decidedAt: new Date() } });

    if (decision === 'rejected') {
      await this.wfModel.updateOne({ id: workflowId }, { $set: { status: 'rejected', completedAt: new Date() } });
      await this.estModel.updateOne({ id: wf.estimationId }, { $set: { status: 'rejected' } });
      this.events.emit('approval.rejected', { workflowId, tenantId, submittedBy: wf.submittedBy, comments });
    } else if (wf.currentStep >= wf.totalSteps) {
      await this.wfModel.updateOne({ id: workflowId }, { $set: { status: 'approved', completedAt: new Date() } });
      await this.estModel.updateOne({ id: wf.estimationId }, { $set: { status: 'approved', isLocked: true, lockedAt: new Date(), lockedBy: userId } });
      this.events.emit('approval.completed', { workflowId, tenantId, submittedBy: wf.submittedBy });
    } else {
      const next = wf.currentStep + 1;
      await this.wfModel.updateOne({ id: workflowId }, { $set: { currentStep: next } });
      await this.stepModel.updateOne({ workflowId, stepNumber: next }, { $set: { status: 'pending' } });
    }
    return this.getWorkflow(workflowId, tenantId);
  }

  async getWorkflow(id: string, tenantId: string) {
    const wf = await this.wfModel.findOne({ id, tenantId }).lean();
    if (!wf) return null;
    const steps = await this.stepModel.find({ workflowId: id }).lean();
    const approverIds = steps.map(s => s.approverId).filter(Boolean);
    const approvers = await this.userModel.find({ id: { $in: approverIds } }).lean();
    const approverMap = new Map(approvers.map(a => [a.id, a]));

    wf.steps = steps.map(s => {
      s.approver = approverMap.get(s.approverId);
      return s;
    });
    return wf;
  }

  async getByEstimation(estimationId: string, tenantId: string) {
    const wfs = await this.wfModel.find({ estimationId, tenantId }).sort({ createdAt: -1 }).lean();
    const wfIds = wfs.map(w => w.id);
    const steps = await this.stepModel.find({ workflowId: { $in: wfIds } }).lean();

    const approverIds = steps.map(s => s.approverId).filter(Boolean);
    const approvers = await this.userModel.find({ id: { $in: approverIds } }).lean();
    const approverMap = new Map(approvers.map(a => [a.id, a]));

    const stepGroup = new Map<string, any[]>();
    for (const s of steps) {
      s.approver = approverMap.get(s.approverId);
      if (!stepGroup.has(s.workflowId)) stepGroup.set(s.workflowId, []);
      stepGroup.get(s.workflowId).push(s);
    }

    return wfs.map(w => {
      w.steps = stepGroup.get(w.id) || [];
      return w;
    });
  }

  async myPending(userId: string) {
    const steps = await this.stepModel.find({ approverId: userId, status: 'pending' }).lean();
    const wfIds = steps.map(s => s.workflowId);
    const wfs = await this.wfModel.find({ id: { $in: wfIds } }).lean();
    const wfMap = new Map(wfs.map(w => [w.id, w]));

    return steps.map(s => {
      s.workflow = wfMap.get(s.workflowId);
      return s;
    });
  }
}

