import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<i> </i>`);
var root = $.from_html(`<div></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let tagList = $.prop($$props, 'tagList', 28, () => ['one']);

	function remove(index) {
		// ...
	}

	var $$exports = {
		get tagList() {
			return tagList();
		},

		set tagList($$value) {
			tagList($$value);
			$.flush();
		}
	};

	var div = root();

	$.each(div, 5, tagList, $.index, ($$anchor, tag, i) => {
		var i_1 = root_1();
		var text = $.child(i_1, true);

		$.reset(i_1);
		$.template_effect(() => $.set_text(text, $.get(tag)));
		$.event('click', i_1, () => remove(i));
		$.append($$anchor, i_1);
	});

	$.reset(div);
	$.append($$anchor, div);

	return $.pop($$exports);
}