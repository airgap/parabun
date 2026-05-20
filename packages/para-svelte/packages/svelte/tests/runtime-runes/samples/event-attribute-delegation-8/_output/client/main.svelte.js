import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div id="app"><button>click me</button></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	$.user_effect(() => {
		const doc_listener = (e) => {
			console.log('document', e.currentTarget === document);
		};

		document.addEventListener('click', doc_listener);

		document.getElementById('app')?.addEventListener('click', (e) => {
			console.log('#app', e.currentTarget === document.getElementById('app'));
		});

		return () => {
			document.removeEventListener('click', doc_listener);
		};
	});

	function onclick() {}

	var div = root();
	var button = $.child(div);

	$.reset(div);
	$.delegated('click', button, onclick);
	$.append($$anchor, div);
	$.pop();
}

$.delegate(['click']);