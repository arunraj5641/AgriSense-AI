"""phase2_status_and_audit

Revision ID: 0386719a0042
Revises: 0386719a0041
Create Date: 2026-09-07 14:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0386719a0042'
down_revision: Union[str, Sequence[str], None] = '0386719a0041'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # Safely extend userrole enum in PostgreSQL to include ADMIN
    if conn.dialect.name == "postgresql":
        conn.execute(sa.text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'ADMIN'"))
        conn.execute(sa.text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'admin'"))

    # Create recommendationstatus enum
    rec_status_enum = sa.Enum(
        'GENERATED', 'UNDER_REVIEW', 'APPROVED', 'NEEDS_REVISION', 'IMPLEMENTED', 'ARCHIVED',
        name='recommendationstatus'
    )
    rec_status_enum.create(conn, checkfirst=True)

    # Add status column to recommendations table with server_default='GENERATED'
    op.add_column(
        'recommendations',
        sa.Column(
            'status',
            sa.Enum('GENERATED', 'UNDER_REVIEW', 'APPROVED', 'NEEDS_REVISION', 'IMPLEMENTED', 'ARCHIVED', name='recommendationstatus'),
            server_default='GENERATED',
            nullable=False
        )
    )

    # Create recommendation_audits table
    op.create_table(
        'recommendation_audits',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('recommendation_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=True),
        sa.Column('user_name', sa.String(length=100), nullable=True),
        sa.Column('user_role', sa.String(length=50), nullable=True),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('details', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['recommendation_id'], ['recommendations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_recommendation_audits_recommendation_id'), 'recommendation_audits', ['recommendation_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_recommendation_audits_recommendation_id'), table_name='recommendation_audits')
    op.drop_table('recommendation_audits')
    op.drop_column('recommendations', 'status')

    conn = op.get_bind()
    if conn.dialect.name == "postgresql":
        sa.Enum(name='recommendationstatus').drop(conn, checkfirst=True)
