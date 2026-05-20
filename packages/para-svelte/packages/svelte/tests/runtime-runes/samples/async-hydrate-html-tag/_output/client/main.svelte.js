import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div><div><!></div> </div>`);

export default function Main($$anchor) {
	function firstTest() {
		return Promise.resolve('<p>first test</p>');
	}

	function otherTest() {
		return Promise.resolve('other test');
	}

	var div = root();
	var div_1 = $.child(div);
	var node = $.child(div_1);

	$.async(node, [], [firstTest], (node, $$html) => {
		$.html(node, () => $.get($$html));
	});

	$.reset(div_1);

	var text = $.sibling(div_1);

	$.reset(div);
	$.template_effect(($0) => $.set_text(text, ` ${$0 ?? ''}`), void 0, [() => otherTest()]);
	$.append($$anchor, div);
}