import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div><button>Button</button></div>`);

export default function Main($$anchor) {
	var div = root();
	var button = $.child(div);

	$.reset(div);

	$.delegated('click', div, (e) => {
		console.log('clicked div');
	});

	$.delegated('click', button, (e) => {
		console.log('clicked button');
		e.stopPropagation();
	});

	$.append($$anchor, div);
}

$.delegate(['click']);