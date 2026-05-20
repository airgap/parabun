import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

var root_1 = $.add_locations($.from_html(`<p>BOOM</p>`), Main[$.FILENAME], [[21, 2]]);
var root_2 = $.add_locations($.from_html(`<div> </div>`), Main[$.FILENAME], [[18, 1]]);
var root_3 = $.add_locations($.from_html(`<p>BOOM</p>`), Main[$.FILENAME], [[30, 2]]);
var root_4 = $.add_locations($.from_html(`<div> </div>`), Main[$.FILENAME], [[27, 1]]);
var root_5 = $.add_locations($.from_html(`<p>BOOM</p>`), Main[$.FILENAME], [[38, 2]]);
var root_6 = $.add_locations($.from_html(`<div> </div>`), Main[$.FILENAME], [[35, 1]]);
var root_7 = $.add_locations($.from_html(`<p>BOOM</p>`), Main[$.FILENAME], [[47, 2]]);
var root_8 = $.add_locations($.from_html(`<div> </div>`), Main[$.FILENAME], [[44, 1]]);
var root = $.add_locations($.from_html(`<!> <!> <!> <!>`, 1), Main[$.FILENAME], []);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let ok = $.prop($$props, 'ok', 3, true);

	function throwError() {
		throw new Error();
	}

	function throwErrorOnUpdate() {
		if (ok()) {
			return "OK";
		} else {
			throwError();
		}
	}

	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var node = $.first_child(fragment);

	{
		const failed = $.wrap_snippet(Main, function ($$anchor) {
			$.validate_snippet_args(...arguments);

			var p = root_1();

			$.append($$anchor, p);
		});

		$.boundary(node, { failed }, ($$anchor) => {
			var div = root_2();
			var text = $.child(div, true);

			$.reset(div);
			$.template_effect(($0) => $.set_text(text, $0), [() => throwError()]);
			$.append($$anchor, div);
		});
	}

	var node_1 = $.sibling(node, 2);

	{
		const failed = $.wrap_snippet(Main, function ($$anchor) {
			$.validate_snippet_args(...arguments);

			var p_1 = root_3();

			$.append($$anchor, p_1);
		});

		$.boundary(node_1, { failed }, ($$anchor) => {
			const result = $.tag($.derived(throwError), 'result');

			$.get(result);

			var div_1 = root_4();
			var text_1 = $.child(div_1, true);

			$.reset(div_1);
			$.template_effect(() => $.set_text(text_1, $.get(result)));
			$.append($$anchor, div_1);
		});
	}

	var node_2 = $.sibling(node_1, 2);

	{
		const failed = $.wrap_snippet(Main, function ($$anchor) {
			$.validate_snippet_args(...arguments);

			var p_2 = root_5();

			$.append($$anchor, p_2);
		});

		$.boundary(node_2, { failed }, ($$anchor) => {
			var div_2 = root_6();
			var text_2 = $.child(div_2, true);

			$.reset(div_2);
			$.template_effect(($0) => $.set_text(text_2, $0), [() => throwErrorOnUpdate()]);
			$.append($$anchor, div_2);
		});
	}

	var node_3 = $.sibling(node_2, 2);

	{
		const failed = $.wrap_snippet(Main, function ($$anchor) {
			$.validate_snippet_args(...arguments);

			var p_3 = root_7();

			$.append($$anchor, p_3);
		});

		$.boundary(node_3, { failed }, ($$anchor) => {
			const result = $.tag($.derived(throwErrorOnUpdate), 'result');

			$.get(result);

			var div_3 = root_8();
			var text_3 = $.child(div_3, true);

			$.reset(div_3);
			$.template_effect(() => $.set_text(text_3, $.get(result)));
			$.append($$anchor, div_3);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}