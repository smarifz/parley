import { Component, OnInit } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, take } from 'rxjs';
import { finalize, map } from 'rxjs/operators';

import { IInterview, InterviewDetailsDTO } from '../interview.model';
import { InterviewService } from '../service/interview.service';
import { IQuestion, QuestionAttributesDTO } from 'app/entities/question/question.model';
import { QuestionService } from 'app/entities/question/service/question.service';
import { JobService } from '../../job/service/job.service';
import { IJob } from '../../job/job.model';
import { UsersService } from '../../users/service/users.service';
import { UsersDTO } from '../../users/users.model';

@Component({
  selector: 'jhi-interview-update',
  templateUrl: './interview-update.component.html',
})
export class InterviewUpdateComponent implements OnInit {
  isSaving = false;
  interviewExists = false;
  interviewId!: number;
  interviewDetails!: InterviewDetailsDTO;
  interviewQuestions!: QuestionAttributesDTO[];
  interviewSelectedUsers!: UsersDTO[];
  jobs?: IJob[];
  userList!: UsersDTO[];
  questionsSharedCollection: IQuestion[] = [];
  interviewForm: FormGroup;

  editForm = this.fb.group({
    id: [],
    details: [],
    questions: [],
  });

  constructor(
    protected interviewService: InterviewService,
    protected jobService: JobService,
    protected questionService: QuestionService,
    protected usersService: UsersService,
    protected activatedRoute: ActivatedRoute,
    protected fb: FormBuilder,
    protected router: Router
  ) {
    this.interviewForm = this.fb.group({
      userIdList: ['', Validators.required],
      jobId: ['', Validators.required],
      interviewDetails: [''],
      candidateFirstName: ['', Validators.required],
      candidateLastName: ['', Validators.required],
      candidateEmail: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.preloadData();
  }

  preloadData(): void {
    this.usersService
      .getUserDisplayList()
      .pipe(take(1))
      .subscribe(user => {
        this.userList = user;
        user.map(u => this.userList.push({ id: u.id, firstName: u.firstName, lastName: u.lastName }));
      });

    this.jobService.query().subscribe({
      next: (res: HttpResponse<IJob[]>) => (this.jobs = res.body ?? []),
    });

    if (this.router.url !== '/interview/new') {
      this.activatedRoute.paramMap.pipe(take(1)).subscribe(paramMap => {
        this.interviewId = Number(paramMap.get('id'));
      });
      this.interviewService
        .getInterviewDetails(this.interviewId)
        .pipe(take(1))
        .subscribe(interview => {
          this.interviewDetails = interview;
          this.interviewSelectedUsers = interview.userList;
        });
      this.questionService
        .getQuestionsByInterview(this.interviewId)
        .pipe(take(1))
        .subscribe(questions => (this.interviewQuestions = questions));
      this.interviewExists = true;
    }
  }

  previousState(): void {
    window.history.back();
  }

  trackQuestionById(index: number, item: IQuestion): number {
    return item.id!;
  }

  getSelectedQuestion(option: IQuestion, selectedVals?: IQuestion[]): IQuestion {
    if (selectedVals) {
      for (const selectedVal of selectedVals) {
        if (option.id === selectedVal.id) {
          return selectedVal;
        }
      }
    }
    return option;
  }

  interviewSubmit(): void {
    if (!this.interviewExists) {
      this.interviewService
        .createInterview(this.interviewForm.value)
        .pipe(take(1))
        .subscribe(interviewDetailsDTO => {
          this.router
            .navigateByUrl(`interview/${Number(interviewDetailsDTO.interview?.id)}/view`)
            .then(function (success) {
              console.log(success);
            })
            .catch(function (error) {
              console.log(error);
            });
        });
    } else {
      // TODO: update
    }
  }

  usersCompare(u1: UsersDTO, u2: UsersDTO): boolean {
    return u1 && u2 ? u1.id === u2.id : u1 === u2;
  }

  protected updateForm(interview: IInterview): void {
    this.editForm.patchValue({
      id: interview.id,
      details: interview.details,
      questions: interview.questions,
    });
  }

  protected subscribeToSaveResponse(result: Observable<HttpResponse<IInterview>>): void {
    result.pipe(finalize(() => this.onSaveFinalize())).subscribe({
      next: () => this.onSaveSuccess(),
      error: () => this.onSaveError(),
    });
  }

  protected onSaveSuccess(): void {
    this.previousState();
  }

  protected onSaveError(): void {
    // Api for inheritance.
  }

  protected onSaveFinalize(): void {
    this.isSaving = false;
  }

  protected loadRelationshipsOptions(): void {
    this.questionService
      .query()
      .pipe(map((res: HttpResponse<IQuestion[]>) => res.body ?? []))
      .pipe(
        map((questions: IQuestion[]) =>
          this.questionService.addQuestionToCollectionIfMissing(questions, ...(this.editForm.get('questions')!.value ?? []))
        )
      )
      .subscribe((questions: IQuestion[]) => (this.questionsSharedCollection = questions));
  }
}
