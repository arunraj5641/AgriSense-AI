"""phase3_companies_contracts_notifications

Revision ID: 0386719a0043
Revises: 0386719a0042
Create Date: 2026-09-07 19:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0386719a0043'
down_revision: Union[str, Sequence[str], None] = '0386719a0042'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    if conn.dialect.name == "postgresql":
        conn.execute(sa.text("DO $$ BEGIN CREATE TYPE procurementstatus AS ENUM ('OPEN', 'PAUSED', 'FULFILLED', 'CLOSED'); EXCEPTION WHEN duplicate_object THEN null; END $$;"))
        conn.execute(sa.text("DO $$ BEGIN CREATE TYPE contractstatus AS ENUM ('AVAILABLE', 'INTERESTED', 'APPLICATION_SUBMITTED', 'UNDER_COMPANY_REVIEW', 'ACCEPTED', 'IN_PROGRESS', 'HARVEST_READY', 'COMPLETED', 'ARCHIVED'); EXCEPTION WHEN duplicate_object THEN null; END $$;"))

    proc_enum = postgresql.ENUM('OPEN', 'PAUSED', 'FULFILLED', 'CLOSED', name='procurementstatus', create_type=False)
    contract_enum = postgresql.ENUM(
        'AVAILABLE', 'INTERESTED', 'APPLICATION_SUBMITTED', 'UNDER_COMPANY_REVIEW',
        'ACCEPTED', 'IN_PROGRESS', 'HARVEST_READY', 'COMPLETED', 'ARCHIVED',
        name='contractstatus',
        create_type=False
    )

    # 2. Companies table
    op.create_table(
        'companies',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=True),
        sa.Column('company_name', sa.String(length=150), nullable=False),
        sa.Column('address', sa.String(length=255), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('processing_category', sa.String(length=100), nullable=False),
        sa.Column('supported_crops', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_companies_email'), 'companies', ['email'], unique=False)
    op.create_index(op.f('ix_companies_user_id'), 'companies', ['user_id'], unique=False)

    # 3. Procurement Requirements table
    op.create_table(
        'procurement_requirements',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('company_id', sa.UUID(), nullable=False),
        sa.Column('crop', sa.String(length=100), nullable=False),
        sa.Column('required_quantity', sa.Float(), nullable=False),
        sa.Column('minimum_quality_grade', sa.String(length=50), nullable=False),
        sa.Column('moisture_percentage', sa.Float(), nullable=True),
        sa.Column('nitrogen_requirement', sa.Float(), nullable=True),
        sa.Column('phosphorus_requirement', sa.Float(), nullable=True),
        sa.Column('potassium_requirement', sa.Float(), nullable=True),
        sa.Column('organic_matter_requirement', sa.Float(), nullable=True),
        sa.Column('minimum_farm_size', sa.Float(), nullable=True),
        sa.Column('preferred_irrigation', sa.String(length=100), nullable=True),
        sa.Column('harvest_window', sa.String(length=100), nullable=True),
        sa.Column('expected_delivery_date', sa.Date(), nullable=True),
        sa.Column('offered_price', sa.Float(), nullable=False),
        sa.Column('status', proc_enum, server_default='OPEN', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_procurement_requirements_company_id'), 'procurement_requirements', ['company_id'], unique=False)
    op.create_index(op.f('ix_procurement_requirements_crop'), 'procurement_requirements', ['crop'], unique=False)

    # 4. Contracts table
    op.create_table(
        'contracts',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('procurement_id', sa.UUID(), nullable=False),
        sa.Column('farm_id', sa.UUID(), nullable=False),
        sa.Column('farmer_id', sa.UUID(), nullable=False),
        sa.Column('company_id', sa.UUID(), nullable=False),
        sa.Column('agreed_quantity', sa.Float(), nullable=False),
        sa.Column('agreed_price', sa.Float(), nullable=False),
        sa.Column('status', contract_enum, server_default='APPLICATION_SUBMITTED', nullable=False),
        sa.Column('terms_and_conditions', sa.Text(), nullable=True),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('signed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['farm_id'], ['farms.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['farmer_id'], ['farmers.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['procurement_id'], ['procurement_requirements.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_contracts_company_id'), 'contracts', ['company_id'], unique=False)
    op.create_index(op.f('ix_contracts_farm_id'), 'contracts', ['farm_id'], unique=False)
    op.create_index(op.f('ix_contracts_farmer_id'), 'contracts', ['farmer_id'], unique=False)
    op.create_index(op.f('ix_contracts_procurement_id'), 'contracts', ['procurement_id'], unique=False)

    # 5. Notifications table
    op.create_table(
        'notifications',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('title', sa.String(length=150), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('notification_type', sa.String(length=100), nullable=False),
        sa.Column('link', sa.String(length=255), nullable=True),
        sa.Column('is_read', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_notifications_is_read'), 'notifications', ['is_read'], unique=False)
    op.create_index(op.f('ix_notifications_notification_type'), 'notifications', ['notification_type'], unique=False)
    op.create_index(op.f('ix_notifications_user_id'), 'notifications', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_table('notifications')
    op.drop_table('contracts')
    op.drop_table('procurement_requirements')
    op.drop_table('companies')
    
    conn = op.get_bind()
    sa.Enum(name='contractstatus').drop(conn, checkfirst=True)
    sa.Enum(name='procurementstatus').drop(conn, checkfirst=True)
