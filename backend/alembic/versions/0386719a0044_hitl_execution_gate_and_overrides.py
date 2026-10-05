"""hitl_execution_gate_and_overrides

Revision ID: 0386719a0044
Revises: 0386719a0043
Create Date: 2026-10-01 11:45:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0386719a0044'
down_revision: Union[str, Sequence[str], None] = '0386719a0043'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # 1. Create OverrideReason enum if Postgres
    if conn.dialect.name == "postgresql":
        conn.execute(sa.text("""
            DO $$ BEGIN 
                CREATE TYPE overridereason AS ENUM (
                    'RESOURCE_CONSTRAINT', 
                    'WEATHER_CONDITION', 
                    'SOIL_CONDITION', 
                    'FARMER_PREFERENCE', 
                    'SAFETY_CONCERN', 
                    'AGRONOMIC_JUDGMENT', 
                    'OTHER'
                ); 
            EXCEPTION WHEN duplicate_object THEN null; 
            END $$;
        """))

    override_enum = postgresql.ENUM(
        'RESOURCE_CONSTRAINT',
        'WEATHER_CONDITION',
        'SOIL_CONDITION',
        'FARMER_PREFERENCE',
        'SAFETY_CONCERN',
        'AGRONOMIC_JUDGMENT',
        'OTHER',
        name='overridereason',
        create_type=False
    )

    # 2. Add columns to recommendations table
    op.add_column('recommendations', sa.Column('is_high_impact', sa.Boolean(), server_default=sa.text('false'), nullable=False))
    op.add_column('recommendations', sa.Column('implemented_at', sa.DateTime(), nullable=True))
    op.add_column('recommendations', sa.Column('implemented_by_id', sa.UUID(), nullable=True))
    op.create_foreign_key(
        'fk_recommendations_implemented_by_id_users',
        'recommendations',
        'users',
        ['implemented_by_id'],
        ['id'],
        ondelete='SET NULL'
    )

    # 3. Add override_reason to recommendation_reviews table
    op.add_column('recommendation_reviews', sa.Column('override_reason', override_enum, nullable=True))

    # 4. Backfill existing recommendations with high-impact status based on keyword patterns
    conn.execute(sa.text("""
        UPDATE recommendations
        SET is_high_impact = true
        WHERE LOWER(recommendation) LIKE '%pest%'
           OR LOWER(recommendation) LIKE '%protection%'
           OR LOWER(recommendation) LIKE '%harvest%'
           OR LOWER(recommendation) LIKE '%machinery%'
           OR LOWER(recommendation) LIKE '%amendment%'
           OR LOWER(recommendation) LIKE '%gypsum%'
           OR LOWER(recommendation) LIKE '%sprayer%'
           OR LOWER(recommendation) LIKE '%combine%';
    """))


def downgrade() -> None:
    op.drop_column('recommendation_reviews', 'override_reason')
    op.drop_constraint('fk_recommendations_implemented_by_id_users', 'recommendations', type_='foreignkey')
    op.drop_column('recommendations', 'implemented_by_id')
    op.drop_column('recommendations', 'implemented_at')
    op.drop_column('recommendations', 'is_high_impact')

    conn = op.get_bind()
    if conn.dialect.name == "postgresql":
        conn.execute(sa.text("DROP TYPE IF EXISTS overridereason;"))
