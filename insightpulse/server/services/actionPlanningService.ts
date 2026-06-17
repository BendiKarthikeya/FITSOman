import { db } from "../db";
import { sql } from "drizzle-orm";

/**
 * Action Planning & Recommendations Service
 * Generates action plans, targeted initiatives, and change management strategies
 */

export interface ActionPlan {
  id: string;
  surveyId: string;
  executiveSummaryId?: string;
  planTitle: string;
  planCategory: 'engagement' | 'culture' | 'retention' | 'leadership' | 'development' | 'compensation' | 'communication';
  priority: 'critical' | 'high' | 'medium' | 'low';

  // Target
  targetSegmentType?: string;
  targetSegmentValue?: string;
  affectedEmployees: number;

  // Action details
  description: string;
  objectives: string[];
  actionSteps: Array<{
    step: number;
    title: string;
    description: string;
    owner?: string;
    dueDate?: Date;
    status?: 'pending' | 'in_progress' | 'completed';
  }>;
  initiatives: Array<{
    name: string;
    description: string;
    type: string;
    estimatedDuration: string;
  }>;

  // Resources
  ownerId?: string;
  stakeholders: string[];
  requiredResources: Array<{
    type: string;
    description: string;
    cost?: number;
  }>;
  estimatedBudget?: number;

  // Timeline
  startDate?: Date;
  targetCompletionDate?: Date;
  actualCompletionDate?: Date;

  // Progress
  status: 'draft' | 'approved' | 'in_progress' | 'completed' | 'cancelled';
  completionPercentage: number;
  milestones: Array<{
    name: string;
    targetDate: Date;
    completed: boolean;
    completedDate?: Date;
  }>;

  // Communication
  communicationPlan: {
    kickoffMeeting?: Date;
    updateFrequency: string;
    stakeholderCommunication: string[];
    successCelebration?: string;
  };
  changeManagementNotes?: string;

  // Results
  expectedImpact: string;
  actualImpact?: Record<string, any>;
  successMetrics: Array<{
    metric: string;
    targetValue: number;
    currentValue?: number;
  }>;

  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ActionPlanningService {

  /**
   * Generate action plan from executive summary
   */
  static async generateActionPlan(params: {
    surveyId: string;
    executiveSummaryId?: string;
    improvementArea: {
      area: string;
      currentScore: number;
      gapToTarget: number;
      priority: 'critical' | 'high' | 'medium' | 'low';
    };
    targetSegment?: {
      type: string;
      value: string;
      size: number;
    };
    createdBy?: string;
  }): Promise<ActionPlan> {
    const { surveyId, executiveSummaryId, improvementArea, targetSegment, createdBy } = params;

    // Determine category and generate specific recommendations
    const planCategory = this.determineCategory(improvementArea.area);
    const { objectives, actionSteps, initiatives } = this.generateRecommendations(
      improvementArea.area,
      improvementArea.currentScore,
      improvementArea.gapToTarget,
      planCategory
    );

    const planId = crypto.randomUUID();
    const now = new Date();
    const targetDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days

    const actionPlan: ActionPlan = {
      id: planId,
      surveyId,
      executiveSummaryId,
      planTitle: `Improve ${improvementArea.area}`,
      planCategory,
      priority: improvementArea.priority,

      targetSegmentType: targetSegment?.type,
      targetSegmentValue: targetSegment?.value,
      affectedEmployees: targetSegment?.size || 0,

      description: `Action plan to improve ${improvementArea.area} from ${improvementArea.currentScore.toFixed(1)} to target level (gap: ${improvementArea.gapToTarget.toFixed(1)} points)`,
      objectives,
      actionSteps,
      initiatives,

      ownerId: createdBy,
      stakeholders: [],
      requiredResources: this.generateRequiredResources(planCategory, improvementArea.gapToTarget),
      estimatedBudget: this.estimateBudget(planCategory, improvementArea.gapToTarget, targetSegment?.size || 0),

      startDate: now,
      targetCompletionDate: targetDate,

      status: 'draft',
      completionPercentage: 0,
      milestones: this.generateMilestones(actionSteps, now, targetDate),

      communicationPlan: {
        kickoffMeeting: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        updateFrequency: 'bi-weekly',
        stakeholderCommunication: ['email updates', 'monthly reports', 'town halls'],
        successCelebration: 'Team recognition event upon completion'
      },
      changeManagementNotes: this.generateChangeManagementNotes(planCategory),

      expectedImpact: `Expected to improve ${improvementArea.area} by ${improvementArea.gapToTarget.toFixed(1)} points over 90 days`,
      successMetrics: [
        {
          metric: improvementArea.area,
          targetValue: improvementArea.currentScore + improvementArea.gapToTarget,
          currentValue: improvementArea.currentScore
        }
      ],

      createdBy,
      createdAt: now,
      updatedAt: now
    };

    // Store in database
    await db.execute(sql`
      INSERT INTO action_plans (
        id, survey_id, executive_summary_id, plan_title, plan_category, priority,
        target_segment_type, target_segment_value, affected_employees,
        description, objectives, action_steps, initiatives,
        owner_id, stakeholders, required_resources, estimated_budget,
        start_date, target_completion_date, status, completion_percentage, milestones,
        communication_plan, change_management_notes, expected_impact, success_metrics,
        created_by, created_at, updated_at
      ) VALUES (
        ${planId}, 
        ${surveyId}, 
        ${executiveSummaryId || null}, 
        ${actionPlan.planTitle}, 
        ${planCategory}, 
        ${actionPlan.priority},
        ${actionPlan.targetSegmentType || null}, 
        ${actionPlan.targetSegmentValue || null}, 
        ${actionPlan.affectedEmployees},
        ${actionPlan.description}, 
        ${JSON.stringify(objectives)}::jsonb, 
        ${JSON.stringify(actionSteps)}::jsonb, 
        ${JSON.stringify(initiatives)}::jsonb,
        ${createdBy || null}, 
        ${JSON.stringify(actionPlan.stakeholders)}::jsonb, 
        ${JSON.stringify(actionPlan.requiredResources)}::jsonb, 
        ${actionPlan.estimatedBudget},
        ${now.toISOString()}, 
        ${targetDate.toISOString()}, 
        ${actionPlan.status}, 
        ${actionPlan.completionPercentage}, 
        ${JSON.stringify(actionPlan.milestones)}::jsonb,
        ${JSON.stringify(actionPlan.communicationPlan)}::jsonb, 
        ${actionPlan.changeManagementNotes}, 
        ${actionPlan.expectedImpact}, 
        ${JSON.stringify(actionPlan.successMetrics)}::jsonb,
        ${createdBy || null}, 
        ${now.toISOString()}, 
        ${now.toISOString()}
      )
    `);

    return actionPlan;
  }

  /**
   * Determine action plan category based on improvement area
   */
  private static determineCategory(area: string): ActionPlan['planCategory'] {
    const areaLower = area.toLowerCase();

    if (areaLower.includes('engagement')) return 'engagement';
    if (areaLower.includes('culture')) return 'culture';
    if (areaLower.includes('retention') || areaLower.includes('turnover')) return 'retention';
    if (areaLower.includes('leadership') || areaLower.includes('management')) return 'leadership';
    if (areaLower.includes('development') || areaLower.includes('growth') || areaLower.includes('training')) return 'development';
    if (areaLower.includes('compensation') || areaLower.includes('pay') || areaLower.includes('benefits')) return 'compensation';
    if (areaLower.includes('communication')) return 'communication';

    return 'engagement'; // default
  }

  /**
   * Generate specific recommendations based on category
   */
  private static generateRecommendations(
    area: string,
    currentScore: number,
    gapToTarget: number,
    category: string
  ): {
    objectives: string[];
    actionSteps: ActionPlan['actionSteps'];
    initiatives: ActionPlan['initiatives'];
  } {
    const recommendations: Record<string, any> = {
      engagement: {
        objectives: [
          'Increase employee engagement score by 15 points',
          'Improve employee satisfaction with work environment',
          'Enhance sense of purpose and connection to company mission'
        ],
        actionSteps: [
          { step: 1, title: 'Conduct Focus Groups', description: 'Run 3-5 focus groups to understand root causes of low engagement', status: 'pending' },
          { step: 2, title: 'Implement Recognition Program', description: 'Launch peer-to-peer and manager recognition program', status: 'pending' },
          { step: 3, title: 'Enhance Communication', description: 'Establish regular town halls and transparent communication channels', status: 'pending' },
          { step: 4, title: 'Career Development Plans', description: 'Create individual development plans for all team members', status: 'pending' },
          { step: 5, title: 'Measure Progress', description: 'Run pulse surveys monthly to track engagement improvements', status: 'pending' }
        ],
        initiatives: [
          { name: 'Engagement Champions Program', description: 'Train team leaders as engagement champions', type: 'training', estimatedDuration: '6 weeks' },
          { name: 'Team Building Activities', description: 'Monthly team building and social events', type: 'events', estimatedDuration: 'ongoing' },
          { name: 'Feedback Loop', description: 'Implement continuous feedback mechanisms', type: 'process', estimatedDuration: '3 months' }
        ]
      },
      culture: {
        objectives: [
          'Strengthen company culture and values alignment',
          'Improve psychological safety and inclusion',
          'Build trust between leadership and teams'
        ],
        actionSteps: [
          { step: 1, title: 'Culture Assessment', description: 'Conduct comprehensive culture assessment', status: 'pending' },
          { step: 2, title: 'Define Core Values', description: 'Clarify and communicate core company values', status: 'pending' },
          { step: 3, title: 'Leadership Modeling', description: 'Train leaders to model desired cultural behaviors', status: 'pending' },
          { step: 4, title: 'Inclusion Initiatives', description: 'Launch DEI programs and employee resource groups', status: 'pending' },
          { step: 5, title: 'Culture Ambassadors', description: 'Identify and empower culture ambassadors', status: 'pending' }
        ],
        initiatives: [
          { name: 'Values Workshops', description: 'Interactive workshops on company values', type: 'training', estimatedDuration: '4 weeks' },
          { name: 'Culture Committee', description: 'Form employee-led culture committee', type: 'governance', estimatedDuration: 'ongoing' },
          { name: 'Storytelling Program', description: 'Share stories that exemplify company values', type: 'communication', estimatedDuration: 'ongoing' }
        ]
      },
      leadership: {
        objectives: [
          'Enhance leadership effectiveness and trust',
          'Improve manager-employee relationships',
          'Develop leadership pipeline'
        ],
        actionSteps: [
          { step: 1, title: '360 Leadership Feedback', description: 'Conduct 360-degree feedback for all leaders', status: 'pending' },
          { step: 2, title: 'Leadership Training', description: 'Implement comprehensive leadership development program', status: 'pending' },
          { step: 3, title: 'Coaching Program', description: 'Provide executive coaching for senior leaders', status: 'pending' },
          { step: 4, title: 'Manager Effectiveness', description: 'Train managers on feedback, recognition, and development conversations', status: 'pending' },
          { step: 5, title: 'Leadership Accountability', description: 'Establish leadership metrics and accountability', status: 'pending' }
        ],
        initiatives: [
          { name: 'Leadership Academy', description: 'Comprehensive leadership training program', type: 'training', estimatedDuration: '12 weeks' },
          { name: 'Mentorship Program', description: 'Pair emerging leaders with senior mentors', type: 'development', estimatedDuration: '6 months' },
          { name: 'Leader Roundtables', description: 'Regular peer learning sessions for leaders', type: 'events', estimatedDuration: 'ongoing' }
        ]
      },
      development: {
        objectives: [
          'Provide clear career growth pathways',
          'Increase learning and development opportunities',
          'Build skills for future success'
        ],
        actionSteps: [
          { step: 1, title: 'Skills Assessment', description: 'Assess current skills and identify gaps', status: 'pending' },
          { step: 2, title: 'Learning Platform', description: 'Implement learning management system', status: 'pending' },
          { step: 3, title: 'Career Frameworks', description: 'Create clear career progression frameworks', status: 'pending' },
          { step: 4, title: 'Development Budget', description: 'Allocate budget for individual development', status: 'pending' },
          { step: 5, title: 'Internal Mobility', description: 'Promote internal job opportunities', status: 'pending' }
        ],
        initiatives: [
          { name: 'Learning Library', description: 'Curated learning resources and courses', type: 'platform', estimatedDuration: '8 weeks' },
          { name: 'Lunch & Learn', description: 'Regular knowledge sharing sessions', type: 'events', estimatedDuration: 'ongoing' },
          { name: 'Tuition Reimbursement', description: 'Program for continuing education', type: 'benefits', estimatedDuration: 'ongoing' }
        ]
      },
      retention: {
        objectives: [
          'Reduce unwanted attrition',
          'Identify and address flight risks',
          'Improve employee loyalty and commitment'
        ],
        actionSteps: [
          { step: 1, title: 'Exit Analysis', description: 'Analyze exit interview data and patterns', status: 'pending' },
          { step: 2, title: 'Stay Interviews', description: 'Conduct stay interviews with high performers', status: 'pending' },
          { step: 3, title: 'Retention Programs', description: 'Implement targeted retention initiatives', status: 'pending' },
          { step: 4, title: 'Career Conversations', description: 'Regular career discussions with all employees', status: 'pending' },
          { step: 5, title: 'Competitive Analysis', description: 'Benchmark compensation and benefits', status: 'pending' }
        ],
        initiatives: [
          { name: 'High Performer Program', description: 'Special programs for top talent', type: 'recognition', estimatedDuration: 'ongoing' },
          { name: 'Flexible Work', description: 'Enhance flexibility and work-life balance', type: 'policy', estimatedDuration: '4 weeks' },
          { name: 'Onboarding Excellence', description: 'Improve new hire onboarding experience', type: 'process', estimatedDuration: '6 weeks' }
        ]
      },
      compensation: {
        objectives: [
          'Ensure competitive and fair compensation',
          'Improve transparency around pay',
          'Enhance total rewards package'
        ],
        actionSteps: [
          { step: 1, title: 'Compensation Analysis', description: 'Conduct market compensation study', status: 'pending' },
          { step: 2, title: 'Pay Equity Review', description: 'Analyze and address pay equity gaps', status: 'pending' },
          { step: 3, title: 'Benefits Enhancement', description: 'Review and improve benefits package', status: 'pending' },
          { step: 4, title: 'Communication Plan', description: 'Improve communication about total rewards', status: 'pending' },
          { step: 5, title: 'Variable Pay', description: 'Implement or enhance variable pay programs', status: 'pending' }
        ],
        initiatives: [
          { name: 'Total Rewards Statement', description: 'Personalized total rewards statements', type: 'communication', estimatedDuration: '4 weeks' },
          { name: 'Benefits Education', description: 'Workshops on maximizing benefits', type: 'training', estimatedDuration: '2 weeks' },
          { name: 'Spot Bonus Program', description: 'On-the-spot recognition bonuses', type: 'recognition', estimatedDuration: '2 weeks' }
        ]
      },
      communication: {
        objectives: [
          'Improve transparency and information flow',
          'Enhance two-way communication',
          'Build trust through open dialogue'
        ],
        actionSteps: [
          { step: 1, title: 'Communication Audit', description: 'Assess current communication effectiveness', status: 'pending' },
          { step: 2, title: 'Town Halls', description: 'Establish regular all-hands meetings', status: 'pending' },
          { step: 3, title: 'Communication Channels', description: 'Implement modern communication tools', status: 'pending' },
          { step: 4, title: 'Leadership Visibility', description: 'Increase leadership accessibility', status: 'pending' },
          { step: 5, title: 'Feedback Mechanisms', description: 'Create safe channels for feedback', status: 'pending' }
        ],
        initiatives: [
          { name: 'Internal Newsletter', description: 'Regular company updates and news', type: 'communication', estimatedDuration: 'ongoing' },
          { name: 'AMA Sessions', description: 'Ask Me Anything sessions with leadership', type: 'events', estimatedDuration: 'ongoing' },
          { name: 'Collaboration Platform', description: 'Modern collaboration tools', type: 'platform', estimatedDuration: '6 weeks' }
        ]
      }
    };

    return recommendations[category] || recommendations.engagement;
  }

  /**
   * Generate required resources
   */
  private static generateRequiredResources(category: string, gapSize: number): ActionPlan['requiredResources'] {
    const baseResources = [
      { type: 'Time', description: 'Leadership and team member time for planning and execution', cost: 0 },
      { type: 'Communication', description: 'Internal communications support', cost: 5000 }
    ];

    const categoryResources: Record<string, any[]> = {
      engagement: [
        { type: 'Survey Tools', description: 'Pulse survey platform subscription', cost: 10000 },
        { type: 'Recognition Platform', description: 'Peer recognition software', cost: 15000 },
        { type: 'Events', description: 'Team building activities budget', cost: 20000 }
      ],
      culture: [
        { type: 'Consultant', description: 'Culture assessment and strategy consultant', cost: 50000 },
        { type: 'Training', description: 'Values and culture workshops', cost: 25000 },
        { type: 'DEI Programs', description: 'Inclusion initiatives', cost: 30000 }
      ],
      leadership: [
        { type: 'Training Program', description: 'Leadership development program', cost: 75000 },
        { type: 'Executive Coaching', description: 'Coaching for senior leaders', cost: 50000 },
        { type: '360 Platform', description: 'Leadership feedback tool', cost: 20000 }
      ],
      development: [
        { type: 'LMS Platform', description: 'Learning management system', cost: 40000 },
        { type: 'Content Library', description: 'Learning content subscriptions', cost: 30000 },
        { type: 'Development Budget', description: 'Individual learning budgets', cost: 100000 }
      ],
      retention: [
        { type: 'Analytics', description: 'Retention analytics tools', cost: 15000 },
        { type: 'Programs', description: 'Retention initiative implementation', cost: 50000 },
        { type: 'Flexibility Tools', description: 'Remote work and flexibility tools', cost: 20000 }
      ],
      compensation: [
        { type: 'Market Data', description: 'Compensation benchmarking data', cost: 25000 },
        { type: 'Consultant', description: 'Compensation consultant', cost: 40000 },
        { type: 'Pay Adjustments', description: 'Budget for equity adjustments', cost: 200000 }
      ],
      communication: [
        { type: 'Platform', description: 'Communication and collaboration tools', cost: 30000 },
        { type: 'Training', description: 'Communication skills training', cost: 15000 },
        { type: 'Content', description: 'Internal communications support', cost: 20000 }
      ]
    };

    return [...baseResources, ...(categoryResources[category] || [])];
  }

  /**
   * Estimate budget based on gap size and affected population
   */
  private static estimateBudget(category: string, gapSize: number, populationSize: number): number {
    const baselineBudget: Record<string, number> = {
      engagement: 50000,
      culture: 100000,
      leadership: 150000,
      development: 170000,
      retention: 270000,
      compensation: 300000,
      communication: 65000
    };

    const baseline = baselineBudget[category] || 50000;
    const gapMultiplier = 1 + (gapSize / 100); // Larger gap = more budget
    const sizeMultiplier = 1 + (populationSize / 1000); // Larger population = more budget

    return Math.round(baseline * gapMultiplier * sizeMultiplier);
  }

  /**
   * Generate milestones from action steps
   */
  private static generateMilestones(
    actionSteps: ActionPlan['actionSteps'],
    startDate: Date,
    endDate: Date
  ): ActionPlan['milestones'] {
    const totalDuration = endDate.getTime() - startDate.getTime();
    const stepDuration = totalDuration / actionSteps.length;

    return actionSteps.map((step, index) => ({
      name: step.title,
      targetDate: new Date(startDate.getTime() + (stepDuration * (index + 1))),
      completed: false
    }));
  }

  /**
   * Generate change management notes
   */
  private static generateChangeManagementNotes(category: string): string {
    const notes: Record<string, string> = {
      engagement: 'Focus on building buy-in through transparent communication. Involve employees in solution design. Celebrate quick wins to build momentum.',
      culture: 'Cultural change takes time. Lead by example from the top. Make values visible in daily operations. Be patient and persistent.',
      leadership: 'Leaders must model vulnerability and openness to feedback. Provide psychological safety during the transition. Recognize and reward new leadership behaviors.',
      development: 'Position as investment in employee success. Make learning accessible and relevant. Create time and space for development activities.',
      retention: 'Act with urgency on retention risks. Address concerns proactively. Show commitment through visible actions, not just words.',
      compensation: 'Communicate total value of compensation package. Be transparent about constraints. Focus on fairness and equity.',
      communication: 'Lead with listening. Create safe spaces for feedback. Follow through on commitments. Build communication as two-way street.'
    };

    return notes[category] || notes.engagement;
  }

  /**
   * Update action plan progress
   */
  static async updateActionPlanProgress(
    planId: string,
    updates: {
      completionPercentage?: number;
      status?: ActionPlan['status'];
      milestones?: ActionPlan['milestones'];
      actualImpact?: Record<string, any>;
    }
  ): Promise<void> {
    const setClause: string[] = [];
    const values: any[] = [];

    if (updates.completionPercentage !== undefined) {
      setClause.push('completion_percentage = $' + (values.length + 1));
      values.push(updates.completionPercentage);
    }

    if (updates.status) {
      setClause.push('status = $' + (values.length + 1));
      values.push(updates.status);
    }

    if (updates.milestones) {
      setClause.push('milestones = $' + (values.length + 1));
      values.push(JSON.stringify(updates.milestones));
    }

    if (updates.actualImpact) {
      setClause.push('actual_impact = $' + (values.length + 1));
      values.push(JSON.stringify(updates.actualImpact));
    }

    setClause.push('updated_at = now()');

    if (updates.status === 'completed') {
      setClause.push('actual_completion_date = now()');
    }

    await db.execute(sql`
      UPDATE action_plans 
      SET ${sql.raw(setClause.join(', '))}
      WHERE id = ${planId}
    `);
  }

  /**
   * Get action plans for a survey
   */
  static async getActionPlans(surveyId: string): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT * FROM action_plans 
      WHERE survey_id = ${surveyId}
      ORDER BY created_at DESC
    `);

    return (result.rows || []).map((row: any) => ({
      id: row.id,
      surveyId: row.survey_id,
      actionTitle: row.action_title,
      actionDescription: row.action_description,
      priority: row.priority,
      category: row.category,
      owner: row.owner,
      estimatedImpact: row.estimated_impact,
      status: row.status,
      implementationSteps: row.implementation_steps || [],
      successMetrics: row.success_metrics || [],
      relatedInsights: row.related_insights || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }
}

export default ActionPlanningService;
