package handlers

import (
	"net/http"

	LingEcho "github.com/LingByte/LingDialog"
	"github.com/LingByte/LingDialog/internal/models"
	"github.com/LingByte/LingDialog/pkg/config"
	"github.com/LingByte/LingDialog/pkg/constants"
	"github.com/LingByte/LingDialog/pkg/logger"
	"github.com/LingByte/LingDialog/pkg/search"
	"github.com/LingByte/LingDialog/pkg/utils"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

func (h *Handlers) GetObjs() []LingEcho.WebObject {
	return []LingEcho.WebObject{
		{
			Group:       "lingEcho",
			Desc:        "User",
			Model:       &models.User{},
			Name:        "user",
			Filterables: []string{"UpdatedAt", "CreatedAt"},
			Editables:   []string{"Email", "Phone", "FirstName", "LastName", "DisplayName", "Role", "Permissions", "Enabled"},
			Searchables: []string{},
			Orderables:  []string{"UpdatedAt"},
			GetDB: func(c *gin.Context, isCreate bool) *gorm.DB {
				if isCreate {
					return h.db
				}
				return h.db.Where("deleted_at", nil)
			},
			BeforeCreate: func(db *gorm.DB, ctx *gin.Context, vptr any) error {
				return nil
			},
		},
		{
			Group:       "novel",
			Desc:        "Novel",
			Model:       &models.Novel{},
			Name:        "novel",
			Filterables: []string{"Title", "Status", "Genre", "AuthorID", "UpdatedAt", "CreatedAt"},
			Editables:   []string{"Title", "Status", "Genre", "Description", "WorldSetting", "Tags", "CoverImage", "StyleGuide", "ReferenceNovel", "AuthorID"},
			Searchables: []string{"Title", "Description", "Tags"},
			Orderables:  []string{"UpdatedAt", "CreatedAt", "Title"},
		},
		{
			Group:       "novel",
			Desc:        "Volume",
			Model:       &models.Volume{},
			Name:        "volume",
			Filterables: []string{"NovelID", "Title", "UpdatedAt", "CreatedAt"},
			Editables:   []string{"Title", "Description", "NovelID"},
			Searchables: []string{"Title", "Description"},
			Orderables:  []string{"UpdatedAt", "CreatedAt", "Title"},
		},
		{
			Group:       "novel",
			Desc:        "Chapter",
			Model:       &models.Chapter{},
			Name:        "chapter",
			Filterables: []string{"NovelID", "VolumeID", "Title", "Order", "Status", "UpdatedAt", "CreatedAt"},
			Editables:   []string{"Title", "Content", "Order", "Summary", "CharacterIDs", "PlotPointIDs", "PreviousSummary", "Outline", "Status", "NovelID", "VolumeID"},
			Searchables: []string{"Title", "Content"},
			Orderables:  []string{"Order", "UpdatedAt", "CreatedAt", "Title"},
			BeforeUpdate: func(db *gorm.DB, ctx *gin.Context, vptr any, vals map[string]any) error {
				// 如果更新了内容但没有摘要，自动生成摘要
				if content, hasContent := vals["Content"]; hasContent && content != nil {
					if summary, hasSummary := vals["Summary"]; !hasSummary || summary == nil || summary == "" {
						contentStr, ok := content.(string)
						if ok && contentStr != "" {
							// 获取章节标题
							var title string
							if titleVal, hasTitle := vals["Title"]; hasTitle && titleVal != nil {
								title, _ = titleVal.(string)
							}
							if title == "" {
								// 从数据库获取现有标题
								chapter := vptr.(*models.Chapter)
								if chapter.Title != "" {
									title = chapter.Title
								} else {
									title = "未命名章节"
								}
							}

							// 这里我们需要AI处理器来生成摘要
							// 由于在WebObject钩子中无法直接访问AI处理器，
							// 我们先跳过自动生成，让用户手动生成
							// 或者在聊天上下文构建时自动生成
							logger.Info("章节内容已更新，建议生成摘要",
								zap.String("title", title),
								zap.Int("contentLength", len(contentStr)))
						}
					}
				}
				return nil
			},
		},
		{
			Group:       "novel",
			Desc:        "Character",
			Model:       &models.Character{},
			Name:        "character",
			Filterables: []string{"NovelID", "Name", "UpdatedAt", "CreatedAt"},
			Editables:   []string{"Name", "Description", "NovelID"},
			Searchables: []string{"Name", "Description"},
			Orderables:  []string{"UpdatedAt", "CreatedAt", "Name"},
		},
		{
			Group:       "novel",
			Desc:        "PlotPoint",
			Model:       &models.PlotPoint{},
			Name:        "plotpoint",
			Filterables: []string{"NovelID", "Title", "UpdatedAt", "CreatedAt"},
			Editables:   []string{"Title", "Content", "NovelID"},
			Searchables: []string{"Title", "Content"},
			Orderables:  []string{"UpdatedAt", "CreatedAt", "Title"},
		},
	}
}

func (h *Handlers) GetDocs() []LingEcho.UriDoc {
	// Define the API documentation
	uriDocs := []LingEcho.UriDoc{
		{
			Group:        "User Authorization",
			Path:         config.GlobalConfig.APIPrefix + "/auth/login/password",
			Method:       http.MethodPost,
			AuthRequired: false,
			Desc:         "User login with email and password",
			Request: &LingEcho.DocField{
				Type: "object",
				Fields: []LingEcho.DocField{
					{Name: "email", Type: LingEcho.TYPE_STRING, Required: true, Desc: "User email"},
					{Name: "password", Type: LingEcho.TYPE_STRING, Required: true, Desc: "User password"},
					{Name: "timezone", Type: LingEcho.TYPE_STRING, Desc: "User timezone"},
					{Name: "remember", Type: LingEcho.TYPE_BOOLEAN, Desc: "Remember login"},
				},
			},
		},
		{
			Group:        "User Authorization",
			Path:         config.GlobalConfig.APIPrefix + "/auth/login/email",
			Method:       http.MethodPost,
			AuthRequired: false,
			Desc:         "User login with email verification code",
			Request: &LingEcho.DocField{
				Type: "object",
				Fields: []LingEcho.DocField{
					{Name: "email", Type: LingEcho.TYPE_STRING, Required: true, Desc: "User email"},
					{Name: "code", Type: LingEcho.TYPE_STRING, Required: true, Desc: "Verification code"},
					{Name: "timezone", Type: LingEcho.TYPE_STRING, Desc: "User timezone"},
				},
			},
		},
		{
			Group:        "User Authorization",
			Path:         config.GlobalConfig.APIPrefix + "/auth/register",
			Method:       http.MethodPost,
			AuthRequired: false,
			Desc:         "User registration",
			Request: &LingEcho.DocField{
				Type: "object",
				Fields: []LingEcho.DocField{
					{Name: "email", Type: LingEcho.TYPE_STRING, Required: true, Desc: "User email"},
					{Name: "password", Type: LingEcho.TYPE_STRING, Required: true, Desc: "User password (min 6 chars)"},
					{Name: "displayName", Type: LingEcho.TYPE_STRING, Desc: "Display name"},
					{Name: "firstName", Type: LingEcho.TYPE_STRING, Desc: "First name"},
					{Name: "lastName", Type: LingEcho.TYPE_STRING, Desc: "Last name"},
					{Name: "code", Type: LingEcho.TYPE_STRING, Desc: "Email verification code"},
				},
			},
		},
		{
			Group:        "User Authorization",
			Path:         config.GlobalConfig.APIPrefix + "/auth/logout",
			Method:       http.MethodGet,
			AuthRequired: true,
			Desc:         "User logout, if `?next={NEXT_URL}`is not empty, redirect to {NEXT_URL}",
		},
		{
			Group:        "User Authorization",
			Path:         config.GlobalConfig.APIPrefix + "/auth/email/code",
			Method:       http.MethodPost,
			AuthRequired: false,
			Desc:         "Send email verification code",
			Request: &LingEcho.DocField{
				Type: "object",
				Fields: []LingEcho.DocField{
					{Name: "email", Type: LingEcho.TYPE_STRING, Required: true, Desc: "User email"},
					{Name: "type", Type: LingEcho.TYPE_STRING, Desc: "Code type: login, register, reset"},
				},
			},
		},
		{
			Group:        "User Authorization",
			Path:         config.GlobalConfig.APIPrefix + "/auth/reset-password",
			Method:       http.MethodPost,
			AuthRequired: false,
			Desc:         "Reset user password",
			Request: &LingEcho.DocField{
				Type: "object",
				Fields: []LingEcho.DocField{
					{Name: "email", Type: LingEcho.TYPE_STRING, Required: true, Desc: "User email"},
					{Name: "code", Type: LingEcho.TYPE_STRING, Required: true, Desc: "Verification code"},
					{Name: "newPassword", Type: LingEcho.TYPE_STRING, Required: true, Desc: "New password (min 6 chars)"},
				},
			},
		},
		{
			Group:        "User Management",
			Path:         config.GlobalConfig.APIPrefix + "/user/me",
			Method:       http.MethodGet,
			AuthRequired: true,
			Desc:         "Get current user information",
		},
		{
			Group:        "User Management",
			Path:         config.GlobalConfig.APIPrefix + "/user/profile",
			Method:       http.MethodPut,
			AuthRequired: true,
			Desc:         "Update user profile",
			Request: &LingEcho.DocField{
				Type: "object",
				Fields: []LingEcho.DocField{
					{Name: "displayName", Type: LingEcho.TYPE_STRING, Desc: "Display name"},
					{Name: "firstName", Type: LingEcho.TYPE_STRING, Desc: "First name"},
					{Name: "lastName", Type: LingEcho.TYPE_STRING, Desc: "Last name"},
					{Name: "phone", Type: LingEcho.TYPE_STRING, Desc: "Phone number"},
					{Name: "avatar", Type: LingEcho.TYPE_STRING, Desc: "Avatar URL"},
					{Name: "gender", Type: LingEcho.TYPE_STRING, Desc: "Gender"},
					{Name: "city", Type: LingEcho.TYPE_STRING, Desc: "City"},
					{Name: "region", Type: LingEcho.TYPE_STRING, Desc: "Region"},
					{Name: "country", Type: LingEcho.TYPE_STRING, Desc: "Country"},
					{Name: "timezone", Type: LingEcho.TYPE_STRING, Desc: "Timezone"},
					{Name: "locale", Type: LingEcho.TYPE_STRING, Desc: "Locale"},
				},
			},
		},
	}

	// 从数据库读取搜索配置，如果数据库中没有则使用配置文件
	searchEnabled := utils.GetBoolValue(h.db, constants.KEY_SEARCH_ENABLED)
	if !searchEnabled && config.GlobalConfig != nil {
		searchEnabled = config.GlobalConfig.SearchEnabled
	}

	if searchEnabled {
		uriDocs = append(uriDocs, []LingEcho.UriDoc{
			{
				Group:   "Search",
				Path:    config.GlobalConfig.APIPrefix + "/search",
				Method:  http.MethodPost,
				Desc:    "Execute a search query",
				Request: LingEcho.GetDocDefine(search.SearchRequest{}),
				Response: &LingEcho.DocField{
					Type: "object",
					Fields: []LingEcho.DocField{
						{Name: "Total", Type: LingEcho.TYPE_INT},
						{Name: "Took", Type: LingEcho.TYPE_INT},
						{Name: "Hits", Type: "array", Fields: []LingEcho.DocField{
							{Name: "ID", Type: LingEcho.TYPE_STRING},
							{Name: "Score", Type: LingEcho.TYPE_FLOAT},
							{Name: "Fields", Type: "object"},
						}},
					},
				},
			},
			{
				Group:        "Search",
				Path:         config.GlobalConfig.APIPrefix + "/search/index",
				Method:       http.MethodPost,
				AuthRequired: true,
				Desc:         "Index a new document",
				Request:      LingEcho.GetDocDefine(search.Doc{}),
				Response: &LingEcho.DocField{
					Type: LingEcho.TYPE_BOOLEAN,
					Desc: "true if document is indexed successfully",
				},
			},
			{
				Group:        "Search",
				Path:         config.GlobalConfig.APIPrefix + "/search/delete",
				Method:       http.MethodPost,
				AuthRequired: true,
				Desc:         "Delete a document by its ID",
				Request: &LingEcho.DocField{
					Type: "object",
					Fields: []LingEcho.DocField{
						{Name: "ID", Type: LingEcho.TYPE_STRING},
					},
				},
				Response: &LingEcho.DocField{
					Type: LingEcho.TYPE_BOOLEAN,
					Desc: "true if document is deleted successfully",
				},
			},
			{
				Group:        "Search",
				Path:         config.GlobalConfig.APIPrefix + "/search/auto-complete",
				Method:       http.MethodPost,
				AuthRequired: false,
				Desc:         "Get search query auto-completion suggestions",
				Request: &LingEcho.DocField{
					Type: "object",
					Fields: []LingEcho.DocField{
						{Name: "Keyword", Type: LingEcho.TYPE_STRING},
					},
				},
				Response: &LingEcho.DocField{
					Type: "object",
					Fields: []LingEcho.DocField{
						{Name: "suggestions", Type: "array", Fields: []LingEcho.DocField{
							{Name: "suggestion", Type: LingEcho.TYPE_STRING},
						}},
					},
				},
			},
			{
				Group:        "Search",
				Path:         config.GlobalConfig.APIPrefix + "/search/suggest",
				Method:       http.MethodPost,
				AuthRequired: false,
				Desc:         "Get search suggestions based on the keyword",
				Request: &LingEcho.DocField{
					Type: "object",
					Fields: []LingEcho.DocField{
						{Name: "Keyword", Type: LingEcho.TYPE_STRING},
					},
				},
				Response: &LingEcho.DocField{
					Type: "object",
					Fields: []LingEcho.DocField{
						{Name: "suggestions", Type: "array", Fields: []LingEcho.DocField{
							{Name: "suggestion", Type: LingEcho.TYPE_STRING},
						}},
					},
				},
			},
		}...)
	}
	return uriDocs
}
