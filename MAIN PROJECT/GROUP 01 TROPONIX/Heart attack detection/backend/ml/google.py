from flask import Flask, render_template, request
from search_engine import search_pubmed, rank_results

app = Flask(__name__, template_folder="templates", static_folder="static")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/search')
def search():
    query = request.args.get('q', '').strip()
    if not query:
        return render_template('index.html', message="Please enter a search query.")

    # 🔍 ONLY PubMed search
    raw_papers = search_pubmed(query, max_results=20)
    papers = rank_results(query, raw_papers, top_k=10)

    return render_template(
        'results.html',
        query=query,
        papers=papers
    )

if __name__ == '__main__':
    print("Starting Mini Google (Flask) on http://127.0.0.1:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)
