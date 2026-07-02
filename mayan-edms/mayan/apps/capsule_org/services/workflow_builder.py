"""
Per-firm status Workflow builder.

Creates a Mayan Workflow with the document-review states
Submitted (initial) -> Under review -> Needs correction -> Accepted and
the transitions between them, then links it to the firm's DocumentType
with `auto_launch=True` so every newly uploaded firm document launches the
workflow at "Submitted".

Study reference: `mayan/apps/document_states/models/`.
"""
from django.apps import apps
from django.utils.text import slugify

STATE_SUBMITTED = 'Submitted'
STATE_UNDER_REVIEW = 'Under review'
STATE_NEEDS_CORRECTION = 'Needs correction'
STATE_ACCEPTED = 'Accepted'


def build_status_workflow(firm, user=None):
    """
    Create the firm's status Workflow (idempotent on `firm.workflow`) and
    link it to the firm DocumentType with auto_launch=True. Returns the
    Workflow.
    """
    if firm.workflow is not None:
        return firm.workflow

    Workflow = apps.get_model(
        app_label='document_states', model_name='Workflow'
    )
    WorkflowState = apps.get_model(
        app_label='document_states', model_name='WorkflowState'
    )
    WorkflowTransition = apps.get_model(
        app_label='document_states', model_name='WorkflowTransition'
    )

    internal_name = 'capsule_firm_{}_status'.format(
        slugify(firm.slug).replace('-', '_')
    )
    label = 'Capsule: {} — status'.format(firm.name)

    workflow = Workflow(
        internal_name=internal_name, label=label, auto_launch=True
    )
    workflow._event_ignore = True
    workflow.save()

    def _state(label_text, initial=False, final=False, completion=0):
        state = WorkflowState(
            workflow=workflow, label=label_text, initial=initial,
            final=final, completion=completion
        )
        state._event_ignore = True
        state.save()
        return state

    submitted = _state(STATE_SUBMITTED, initial=True, completion=0)
    under_review = _state(STATE_UNDER_REVIEW, completion=33)
    needs_correction = _state(STATE_NEEDS_CORRECTION, completion=66)
    accepted = _state(STATE_ACCEPTED, final=True, completion=100)

    def _transition(label_text, origin, destination):
        transition = WorkflowTransition(
            workflow=workflow, label=label_text, origin_state=origin,
            destination_state=destination
        )
        transition._event_ignore = True
        transition.save()
        return transition

    _transition('Begin review', submitted, under_review)
    _transition('Request correction', under_review, needs_correction)
    _transition('Resubmit', needs_correction, under_review)
    _transition('Accept', under_review, accepted)

    if firm.document_type:
        workflow.document_types.add(firm.document_type)

    firm.workflow = workflow
    firm.save(update_fields=['workflow'])

    return workflow
