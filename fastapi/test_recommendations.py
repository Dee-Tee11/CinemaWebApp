"""
Script para testar geração de recomendações para um utilizador específico
"""
from main import generate_and_save_recommendations

# 🎯 ALTERAR AQUI O USER_ID PARA TESTAR
USER_ID = "user_36YdzNZ7EaxTfzVGjTOIVDZg1qY"

if __name__ == "__main__":
    print(f"🚀 Gerando recomendações para o usuário: {USER_ID}\n")
    print("=" * 60)
    
    generate_and_save_recommendations(USER_ID)
    
    print("\n" + "=" * 60)
    print("✅ Processo concluído!")
    print("\n💡 Para testar outro usuário, altere a variável USER_ID no código")
