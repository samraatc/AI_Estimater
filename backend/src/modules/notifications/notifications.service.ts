import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as nodemailer from 'nodemailer';
import { User, UserDocument } from '../users/entities/user.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private mailer: nodemailer.Transporter;

  constructor(
    private cfg: ConfigService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {
    const host = cfg.get('storage.emailHost');
    if (host) this.mailer = nodemailer.createTransport({ host, port: cfg.get('storage.emailPort',587), secure: cfg.get('storage.emailSecure',false), auth: { user: cfg.get('storage.emailUser'), pass: cfg.get('storage.emailPass') } });
  }

  @OnEvent('approval.submitted')
  async onApprovalSubmitted(payload: any) {
    try { const steps = payload.workflow?.steps||[]; const s = steps.find((x:any) => x.stepNumber===1); if (!s?.approverId) return; const u = await this.userModel.findOne({ id: s.approverId }).lean(); if (u?.email) await this.send(u.email,'Approval Required — EstimateOS',`<p>Hi ${u.firstName||''},</p><p>An estimation requires your approval.</p>`); } catch (e: any) { this.logger.error(e.message); }
  }

  @OnEvent('approval.completed')
  async onApprovalCompleted(payload: any) {
    try { if (!payload.submittedBy) return; const u = await this.userModel.findOne({ id: payload.submittedBy }).lean(); if (u?.email) await this.send(u.email,'✅ Estimation Approved — EstimateOS',`<p>Hi ${u.firstName||''},</p><p>Your estimation has been approved!</p>`); } catch (e: any) { this.logger.error(e.message); }
  }

  @OnEvent('approval.rejected')
  async onApprovalRejected(payload: any) {
    try { if (!payload.submittedBy) return; const u = await this.userModel.findOne({ id: payload.submittedBy }).lean(); if (u?.email) await this.send(u.email,'❌ Estimation Rejected — EstimateOS',`<p>Hi ${u.firstName||''},</p><p>Your estimation was rejected. Comments: ${payload.comments||'None'}</p>`); } catch (e: any) { this.logger.error(e.message); }
  }

  @OnEvent('ai.pipeline.completed')
  async onAiComplete(payload: any) {
    try { if (!payload.userId) return; const u = await this.userModel.findOne({ id: payload.userId }).lean(); if (u?.email) await this.send(u.email,'🤖 AI Analysis Complete — EstimateOS',`<p>Hi ${u.firstName||''},</p><p>AI analysis for <b>${payload.projectName}</b> is done. Confidence: ${payload.confidence}%</p>`); } catch (e: any) { this.logger.error(e.message); }
  }

  async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.mailer) return;
    try { await this.mailer.sendMail({ from: `"EstimateOS" <${this.cfg.get('storage.emailFrom')}>`, to, subject, html }); } catch (e: any) { this.logger.error(`Email failed: ${e.message}`); }
  }
}
