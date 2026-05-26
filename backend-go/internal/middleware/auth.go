package middleware

import (
	"encoding/json"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	Sub      string `json:"sub"`
	Username string `json:"username"`
	Role     string `json:"role"`
	Nombre   string `json:"nombre"`
	Type     string `json:"type,omitempty"`
	jwt.RegisteredClaims
}

func jwtSecret() []byte {
	s := os.Getenv("JWT_SECRET")
	if s == "" {
		s = "semapa-mobile-dev-secret"
	}
	return []byte(s)
}

func SignToken(sub, username, role, nombre, tokenType string, hours int) (string, error) {
	claims := Claims{
		Sub: sub, Username: username, Role: role, Nombre: nombre, Type: tokenType,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(hours) * time.Hour)),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(jwtSecret())
}

func RequireAuth(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		h := c.GetHeader("Authorization")
		if !strings.HasPrefix(h, "Bearer ") {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Token requerido"})
			c.Abort()
			return
		}
		token, err := jwt.ParseWithClaims(h[7:], &Claims{}, func(t *jwt.Token) (interface{}, error) {
			return jwtSecret(), nil
		})
		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Token inválido"})
			c.Abort()
			return
		}
		claims := token.Claims.(*Claims)
		if len(roles) > 0 {
			ok := false
			for _, r := range roles {
				if r == claims.Role {
					ok = true
					break
				}
			}
			if !ok {
				c.JSON(http.StatusForbidden, gin.H{"error": "Sin permisos"})
				c.Abort()
				return
			}
		}
		c.Set("user", claims)
		c.Next()
	}
}

type mobileUser struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Password string `json:"password"`
	Role     string `json:"role"`
	Nombre   string `json:"nombre"`
}

func LoadMobileUsers() []mobileUser {
	raw := os.Getenv("MOBILE_USERS")
	if raw == "" {
		return []mobileUser{
			{ID: "1", Username: "admin", Password: "admin123", Role: "administrador", Nombre: "Administrador SEMAPA"},
			{ID: "2", Username: "lector1", Password: "lector123", Role: "lector", Nombre: "Lector de Campo"},
		}
	}
	var users []mobileUser
	_ = json.Unmarshal([]byte(raw), &users)
	return users
}
