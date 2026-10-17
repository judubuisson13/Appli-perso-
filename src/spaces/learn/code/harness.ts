/** Code Python chargé une fois dans l'interpréteur : exécute le code de l'élève puis les tests. */
export const HARNESS = `
import traceback as _tb

def _executer(source, ns):
    try:
        exec(compile(source, "mission.py", "exec"), ns)
        return None
    except SyntaxError as e:
        return f"Erreur de syntaxe ligne {e.lineno} : {e.msg}"
    except Exception as e:
        lignes = [l for l in _tb.format_exception(type(e), e, e.__traceback__) if 'mission.py' in l]
        ou = lignes[-1].strip() if lignes else ''
        return f"{type(e).__name__} : {e}" + (f"\\n  ({ou})" if ou else '')

def _tester(tests, ns):
    res = []
    for nom, src in tests:
        try:
            exec(src, ns)
            res.append((nom, True, ""))
        except AssertionError as e:
            res.append((nom, False, str(e) or "Le résultat n'est pas celui attendu."))
        except Exception as e:
            res.append((nom, False, f"{type(e).__name__} : {e}"))
    return res
`;
