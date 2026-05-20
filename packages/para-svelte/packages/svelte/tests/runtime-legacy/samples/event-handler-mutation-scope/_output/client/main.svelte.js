import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button>increase both</button> `, 1);

export default function Main($$anchor) {
	let referenced_directly = $.mutable_source(0);
	let not_referenced_directly = 0;
	let css_based_on_not_referenced = $.mutable_source('');

	function click() {
		$.set(referenced_directly, $.get(referenced_directly) + 1);
		not_referenced_directly += 1;
		$.set(css_based_on_not_referenced, not_referenced_directly % 2 == 1 ? 'background-color: red' : '');
		console.log($.get(referenced_directly //only referenced_directly is increasing
		) + ' - ' + not_referenced_directly);
	}

	var fragment = root();
	var button = $.first_child(fragment);
	var text = $.sibling(button);

	$.template_effect(() => {
		$.set_style(button, $.get(css_based_on_not_referenced));
		$.set_text(text, ` ${$.get(referenced_directly) ?? ''}`);
	});

	$.event('click', button, click);
	$.append($$anchor, fragment);
}