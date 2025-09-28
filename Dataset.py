# DIA 3 — Limpeza de Dados (versão simples)
import kagglehub, pandas as pd, os, ast

pd.set_option("display.max_columns", 120)
pd.set_option("display.width", 220)

# 1) Download e paths
base = kagglehub.dataset_download("rounakbanik/the-movies-dataset")
movies_path  = os.path.join(base, "movies_metadata.csv")
credits_path = os.path.join(base, "credits.csv")

# 2) Ler movies_metadata (tipos como string p/ evitar erros)
df = pd.read_csv(
    movies_path, low_memory=False, dtype=str,
    na_values=["", "NaN", "nan", "None", "null"]
)

# 3) Normalizações mínimas
df["release_date"]  = pd.to_datetime(df.get("release_date"), errors="coerce")
df["release_year"]  = df["release_date"].dt.year
df["id_num"]        = pd.to_numeric(df.get("id"), errors="coerce")
df["_vote_count"]   = pd.to_numeric(df.get("vote_count"), errors="coerce").fillna(0)
df["_has_overview"] = df.get("overview").fillna("").str.strip().ne("")
df["title"]         = df.get("title", "").fillna("").astype(str).str.strip()

print(f"Total: {len(df)} | Com sinopse: {int(df['_has_overview'].sum())}")

# 4) Remover filmes sem sinopse
df = df.loc[df["_has_overview"]].copy()

# 5) credits.csv → diretor/autores (leve)
def _safe_eval(x):
    if pd.isna(x): return []
    try: return ast.literal_eval(x)
    except Exception: return []

def _get_director(crew):
    for p in crew:
        try:
            if str(p.get("job","")).lower() == "director":
                return p.get("name")
        except Exception: pass
    return None

AUTHOR_JOBS = {"writer","screenplay","author"}
def _get_authors(crew):
    names=[]
    for p in crew:
        try:
            if str(p.get("job","")).lower() in AUTHOR_JOBS:
                n=p.get("name")
                if n and n not in names: names.append(n)
        except Exception: pass
    return ", ".join(names) if names else None

cred = pd.read_csv(credits_path, dtype=str, low_memory=False)
cred["id_num"]  = pd.to_numeric(cred.get("id"), errors="coerce")
cred["_crew"]   = cred.get("crew","").apply(_safe_eval)
cred["director"]= cred["_crew"].apply(_get_director)
cred["authors"] = cred["_crew"].apply(_get_authors)
cred = cred.sort_values(by=["director","authors"], na_position="last") \
           .drop_duplicates(subset=["id_num"], keep="first")[["id_num","director","authors"]]

# 6) Merge
df = df.merge(cred, on="id_num", how="left")

# 7) Eliminar duplicados (preferir id_num; senão, title+release_date)
subset_fallback = ["title","release_date"] if "release_date" in df.columns else ["title"]

def _sort_quality(x):
    return x.sort_values(
        by=["_has_overview","_vote_count","release_date","title"],
        ascending=[False,False,False,True],
        na_position="last"
    )

has_id  = df["id_num"].notna()
dedup_a = _sort_quality(df.loc[has_id]).drop_duplicates(subset=["id_num"], keep="first")
dedup_b = _sort_quality(df.loc[~has_id]).drop_duplicates(subset=subset_fallback, keep="first")
df = pd.concat([dedup_a, dedup_b], ignore_index=True)

# 8) Padronizar géneros
GENRE_ALIASES = {
    "sci-fi":"Science Fiction","science fiction":"Science Fiction","science-fiction":"Science Fiction",
    "tv movie":"TV Movie","children":"Family","childrens":"Family","kids":"Family"
}
CANONICAL = {
    "Action","Adventure","Animation","Comedy","Crime","Documentary","Drama","Family",
    "Fantasy","History","Horror","Music","Mystery","Romance","Science Fiction",
    "TV Movie","Thriller","War","Western"
}
def _norm_genre(name):
    if not isinstance(name,str): return None
    low = name.strip().lower()
    if low in GENRE_ALIASES: return GENRE_ALIASES[low]
    t = name.strip().title()
    if t.upper()=="TV MOVIE": t="TV Movie"
    return t if t in CANONICAL else None

def _parse_genres(s):
    if pd.isna(s) or not str(s).strip(): return []
    try:
        data = ast.literal_eval(s)
        out = [_norm_genre(d.get("name")) for d in data if isinstance(d,dict) and "name" in d]
        return [g for g in out if g]
    except Exception:
        return []

df["genres_list"] = df.get("genres","").apply(_parse_genres)
df["main_genre"]  = df["genres_list"].apply(lambda xs: xs[0] if xs else None)

# 9) Validar campos obrigatórios (title, overview, data/ano)
mask_ok = (
    df["title"].ne("") &
    df.get("overview","").fillna("").str.strip().ne("") &
    (df["release_date"].notna() | df["release_year"].notna())
)
removidos = int((~mask_ok).sum())
if removidos: print("Removidos por campos obrigatórios:", removidos)
df = df.loc[mask_ok].copy()

# 10) Relatório + salvar
print("\n=== RELATÓRIO FINAL ===")
print(f"Linhas finais: {len(df)} | Duplicados esperados: 0")
print(df[["title","release_year","director","main_genre"]].head(5).to_string(index=False))

out_csv = "movies_clean_ready.csv"
df.to_csv(out_csv, index=False)
print("✔️ Guardado:", out_csv)

df["genres_str"] = df["genres_list"].apply(lambda xs: ", ".join(xs) if xs else None)

def make_desc(r):
    title = r["title"]
    year  = int(r["release_year"]) if pd.notna(r.get("release_year")) else None
    head  = f"{title} ({year})" if year else title
    genres = (r.get("genres_str") or "").lower()
    director = r.get("director") or ""
    overview = str(r.get("overview") or "").strip().replace("\n", " ")

    parts = []
    if genres and director: parts.append(f"{head} é um {genres} realizado por {director}.")
    elif genres:            parts.append(f"{head} é um {genres}.")
    elif director:          parts.append(f"{head}, realizado por {director}.")
    if overview:            parts.append(overview)
    return " ".join(parts).strip()

df["description_pt"] = df.apply(make_desc, axis=1)

# 12) Validar 100–300 palavras (sem forçar)
df["desc_words"] = df["description_pt"].str.split().str.len()
df["desc_ok_100_300"] = df["desc_words"].between(100, 300)

# 13) Salvar descrições finais (apenas válidas)
cols_out = ["id_num","title","release_year","director","genres_str","description_pt","desc_words"]
df.loc[df["desc_ok_100_300"], cols_out].to_csv("movies_descriptions_100-300.csv", index=False)

print(f"Descrições válidas (100–300): {int(df['desc_ok_100_300'].sum())}")
print("✔️ Guardado: movies_descriptions_100-300.csv")