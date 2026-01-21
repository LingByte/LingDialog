package models

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestBaseModel_TableName(t *testing.T) {
	bm := BaseModel{}
	assert.Equal(t, "", bm.TableName())
}

func TestBaseModel_BeforeCreate(t *testing.T) {
	t.Run("sets default values when zero", func(t *testing.T) {
		bm := &BaseModel{}
		err := bm.BeforeCreate(nil)
		assert.NoError(t, err)
		assert.False(t, bm.CreatedAt.IsZero())
		assert.False(t, bm.UpdatedAt.IsZero())
		assert.Equal(t, SoftDeleteStatusActive, bm.IsDeleted)
	})

	t.Run("preserves existing values", func(t *testing.T) {
		now := time.Now().Add(-1 * time.Hour)
		bm := &BaseModel{
			CreatedAt: now,
			UpdatedAt: now,
			IsDeleted: SoftDeleteStatusDeleted,
		}
		err := bm.BeforeCreate(nil)
		assert.NoError(t, err)
		assert.Equal(t, now.Unix(), bm.CreatedAt.Unix())
		assert.Equal(t, now.Unix(), bm.UpdatedAt.Unix())
		assert.Equal(t, SoftDeleteStatusDeleted, bm.IsDeleted)
	})

	t.Run("sets IsDeleted to active when zero", func(t *testing.T) {
		bm := &BaseModel{
			IsDeleted: 0,
		}
		err := bm.BeforeCreate(nil)
		assert.NoError(t, err)
		assert.Equal(t, SoftDeleteStatusActive, bm.IsDeleted)
	})
}

func TestBaseModel_BeforeUpdate(t *testing.T) {
	bm := &BaseModel{
		UpdatedAt: time.Now().Add(-1 * time.Hour),
	}
	oldTime := bm.UpdatedAt
	err := bm.BeforeUpdate(nil)
	assert.NoError(t, err)
	assert.True(t, bm.UpdatedAt.After(oldTime))
}

func TestBaseModel_IsSoftDeleted(t *testing.T) {
	t.Run("returns true when deleted", func(t *testing.T) {
		bm := &BaseModel{
			IsDeleted: SoftDeleteStatusDeleted,
		}
		assert.True(t, bm.IsSoftDeleted())
	})

	t.Run("returns false when active", func(t *testing.T) {
		bm := &BaseModel{
			IsDeleted: SoftDeleteStatusActive,
		}
		assert.False(t, bm.IsSoftDeleted())
	})
}

func TestBaseModel_SoftDelete(t *testing.T) {
	bm := &BaseModel{
		IsDeleted: SoftDeleteStatusActive,
		UpdateBy:  "",
		UpdatedAt: time.Time{},
	}
	operator := "test-user"
	bm.SoftDelete(operator)
	assert.Equal(t, SoftDeleteStatusDeleted, bm.IsDeleted)
	assert.Equal(t, operator, bm.UpdateBy)
	assert.False(t, bm.UpdatedAt.IsZero())
}

func TestBaseModel_Restore(t *testing.T) {
	bm := &BaseModel{
		IsDeleted: SoftDeleteStatusDeleted,
		UpdateBy:  "",
		UpdatedAt: time.Time{},
	}
	operator := "test-user"
	bm.Restore(operator)
	assert.Equal(t, SoftDeleteStatusActive, bm.IsDeleted)
	assert.Equal(t, operator, bm.UpdateBy)
	assert.False(t, bm.UpdatedAt.IsZero())
}

func TestBaseModel_SetCreateInfo(t *testing.T) {
	bm := &BaseModel{}
	operator := "test-user"
	bm.SetCreateInfo(operator)
	assert.Equal(t, operator, bm.CreateBy)
	assert.Equal(t, operator, bm.UpdateBy)
}

func TestBaseModel_SetUpdateInfo(t *testing.T) {
	bm := &BaseModel{}
	operator := "test-user"
	bm.SetUpdateInfo(operator)
	assert.Equal(t, operator, bm.UpdateBy)
}

func TestBaseModel_GetCreatedAtString(t *testing.T) {
	now := time.Date(2024, 1, 15, 10, 30, 45, 0, time.UTC)
	bm := &BaseModel{
		CreatedAt: now,
	}
	expected := "2024-01-15 10:30:45"
	assert.Equal(t, expected, bm.GetCreatedAtString())
}

func TestBaseModel_GetUpdatedAtString(t *testing.T) {
	t.Run("returns formatted string when not zero", func(t *testing.T) {
		now := time.Date(2024, 1, 15, 10, 30, 45, 0, time.UTC)
		bm := &BaseModel{
			UpdatedAt: now,
		}
		expected := "2024-01-15 10:30:45"
		assert.Equal(t, expected, bm.GetUpdatedAtString())
	})

	t.Run("returns empty string when zero", func(t *testing.T) {
		bm := &BaseModel{
			UpdatedAt: time.Time{},
		}
		assert.Equal(t, "", bm.GetUpdatedAtString())
	})
}

func TestBaseModel_GetCreatedAtUnix(t *testing.T) {
	now := time.Date(2024, 1, 15, 10, 30, 45, 0, time.UTC)
	bm := &BaseModel{
		CreatedAt: now,
	}
	expected := now.Unix()
	assert.Equal(t, expected, bm.GetCreatedAtUnix())
}

func TestBaseModel_GetUpdatedAtUnix(t *testing.T) {
	t.Run("returns unix timestamp when not zero", func(t *testing.T) {
		now := time.Date(2024, 1, 15, 10, 30, 45, 0, time.UTC)
		bm := &BaseModel{
			UpdatedAt: now,
		}
		expected := now.Unix()
		assert.Equal(t, expected, bm.GetUpdatedAtUnix())
	})

	t.Run("returns 0 when zero", func(t *testing.T) {
		bm := &BaseModel{
			UpdatedAt: time.Time{},
		}
		assert.Equal(t, int64(0), bm.GetUpdatedAtUnix())
	})
}

func TestSoftDeleteStatusConstants(t *testing.T) {
	assert.Equal(t, int8(0), SoftDeleteStatusActive)
	assert.Equal(t, int8(1), SoftDeleteStatusDeleted)
}
