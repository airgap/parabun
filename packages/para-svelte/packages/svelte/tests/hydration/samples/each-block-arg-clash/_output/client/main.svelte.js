import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<li> </li>`);
var root = $.from_html(`<ul></ul>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let things = $.prop($$props, 'things', 12);

	var $$exports = {
		get things() {
			return things();
		},

		set things($$value) {
			things($$value);
			$.flush();
		}
	};

	$.init();

	var ul = root();

	$.each(ul, 5, () => ($.deep_read_state(things()), $.untrack(() => things().foo)), $.index, ($$anchor, foo) => {
		var li = root_1();
		var text = $.child(li, true);

		$.reset(li);
		$.template_effect(() => $.set_text(text, $.get(foo)));
		$.append($$anchor, li);
	});

	$.reset(ul);
	$.append($$anchor, ul);

	return $.pop($$exports);
}