"""phase2_xai_sources_reviews

Revision ID: 0386719a0041
Revises: 0386719a0040
Create Date: 2026-09-07 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0386719a0041'
down_revision: Union[str, Sequence[str], None] = '0386719a0040'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()

    # Safely extend userrole enum in PostgreSQL
    if conn.dialect.name == "postgresql":
        conn.execute(sa.text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'EXTENSION_OFFICER'"))
        conn.execute(sa.text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'extension_officer'"))

    # Add evaluation_metadata to recommendations
    op.add_column('recommendations', sa.Column('evaluation_metadata', sa.JSON(), nullable=True))

    # Create recommendation_sources table
    op.create_table(
        'recommendation_sources',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('recommendation_id', sa.UUID(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('organization', sa.String(length=255), nullable=False),
        sa.Column('url', sa.String(length=500), nullable=True),
        sa.Column('crop', sa.String(length=100), nullable=True),
        sa.Column('action', sa.String(length=100), nullable=True),
        sa.Column('description', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['recommendation_id'], ['recommendations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_recommendation_sources_recommendation_id'), 'recommendation_sources', ['recommendation_id'], unique=False)

    # Create recommendation_reviews table
    review_status_enum = sa.Enum('PENDING', 'APPROVED', 'NEEDS_REVISION', name='reviewstatus')
    op.create_table(
        'recommendation_reviews',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('recommendation_id', sa.UUID(), nullable=False),
        sa.Column('reviewer_id', sa.UUID(), nullable=True),
        sa.Column('status', review_status_enum, nullable=False),
        sa.Column('comment', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['recommendation_id'], ['recommendations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['reviewer_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_recommendation_reviews_recommendation_id'), 'recommendation_reviews', ['recommendation_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_recommendation_reviews_recommendation_id'), table_name='recommendation_reviews')
    op.drop_table('recommendation_reviews')
    
    # Drop reviewstatus enum if postgres
    conn = op.get_bind()
    if conn.dialect.name == "postgresql":
        sa.Enum(name='reviewstatus').drop(conn, checkfirst=True)

    op.drop_index(op.f('ix_recommendation_sources_recommendation_id'), table_name='recommendation_sources')
    op.drop_table('recommendation_sources')

    op.drop_column('recommendations', 'evaluation_metadata')
